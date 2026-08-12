import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

export type StreamHealthStatus = 'starting' | 'online' | 'stalled' | 'offline' | 'codecUnsupported';

export interface StreamHealth {
  streamKey: string;
  cameraId: string;
  cameraName: string;
  protocol: string;
  status: StreamHealthStatus;
  hlsUrl: string;
  uptime: number;
  restartCount: number;
  lastError: string | null;
  maskedSource: string;
  lastAccessTime: number;
  logs: string[];
}

export interface Camera {
  id: string;
  name: string;
  protocol?: string;
  rtspUrl?: string;
  rtmpUrl?: string;
  fullRtmpUrl?: string;
  rtmpServerUrl?: string;
  videoStreamUrl?: string;
  streamKey?: string;
  [key: string]: any;
}

interface StreamState {
  streamKey: string;
  camera: Camera;
  rawSource: string;
  maskedSource: string;
  process: ChildProcess | null;
  startTime: number;
  lastAccessTime: number;
  restartCount: number;
  lastRestartTime: number;
  status: StreamHealthStatus;
  lastError: string | null;
  logs: string[];
}

export class StreamManager {
  private streams = new Map<string, StreamState>();
  private maxActiveStreams: number;
  private hlsSegmentSeconds: number;
  private hlsListSize: number;
  private idleTimeoutMs: number;
  private ffmpegPath: string;
  private hlsDir: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.maxActiveStreams = parseInt(process.env.MAX_ACTIVE_STREAMS || '32', 10);
    this.hlsSegmentSeconds = parseInt(process.env.HLS_SEGMENT_SECONDS || '2', 10);
    this.hlsListSize = parseInt(process.env.HLS_LIST_SIZE || '4', 10);
    this.idleTimeoutMs = parseInt(process.env.STREAM_IDLE_TIMEOUT_MS || '120000', 10);
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.hlsDir = '/tmp/hls';

    this.ensureHlsDir();

    // Periodically prune idle streams and check health
    this.cleanupInterval = setInterval(() => {
      this.housekeeping();
    }, 15000);
  }

  private ensureHlsDir() {
    if (!fs.existsSync(this.hlsDir)) {
      try {
        fs.mkdirSync(this.hlsDir, { recursive: true });
      } catch (e) {
        console.error('[StreamManager] Error creating HLS directory:', e);
      }
    }
  }

  /**
   * Masks sensitive credentials (user:password) from RTSP or RTMP URLs for logging/UI.
   */
  public maskCredentials(url: string): string {
    if (!url) return '';
    return url.replace(/\/\/(.*):(.*)@/, '//***:***@');
  }

  /**
   * Resolves the primary video stream source URL for a given camera object.
   */
  public getValidStreamSource(cam: Camera): string {
    if (!cam) return '';

    // Prioritize explicit RTSP URL if specified
    if (cam.protocol === 'RTSP' || (cam.rtspUrl && cam.rtspUrl.trim().startsWith('rtsp://'))) {
      if (cam.rtspUrl && cam.rtspUrl.trim().startsWith('rtsp://')) {
        return cam.rtspUrl.trim();
      }
    }

    // RTMP candidates
    const rtmpCandidates = [cam.rtmpUrl, cam.fullRtmpUrl, cam.rtmpServerUrl].filter(Boolean);
    for (const candidate of rtmpCandidates) {
      let str = (candidate as string).trim();
      if (str.startsWith('rtmp://')) {
        if (str.includes('localhost:1935') || str.includes('127.0.0.1:1935') || str.includes('aerocam.itlfibra.com:1935')) {
          str = str.replace(/localhost:1935|127\.0\.0\.1:1935|aerocam\.itlfibra\.com:1935/g, 'monitoramento.unityautomacoes.com.br:1935');
        }
        return str;
      }
      if (str.startsWith('http://') || str.startsWith('https://')) {
        return str;
      }
    }

    if (cam.videoStreamUrl && cam.videoStreamUrl.trim()) {
      return cam.videoStreamUrl.trim();
    }

    if (cam.rtspUrl && cam.rtspUrl.trim()) {
      return cam.rtspUrl.trim();
    }

    const key = this.getStreamKey(cam);
    return `rtmp://monitoramento.unityautomacoes.com.br:1935/live/${key}`;
  }

  /**
   * Derive standardized stream key for a camera.
   */
  public getStreamKey(cam: Camera): string {
    if (cam.streamKey && cam.streamKey.trim()) {
      return cam.streamKey.trim().replace(/^cam-/, 'cam_');
    }
    if (cam.id) {
      const cleanId = cam.id.replace(/^cam-/, '').replace(/^cam_/, '');
      return `cam_${cleanId}`;
    }
    return 'cam_unknown';
  }

  /**
   * Main entry point to ensure worker process is running for a camera.
   */
  public ensureStream(camera: Camera, profile = 'default'): { streamKey: string; hlsPath: string; hlsUrl: string; status: StreamHealthStatus } {
    if (!camera) {
      throw new Error('Camera is required');
    }

    const streamKey = this.getStreamKey(camera);
    const hlsPath = path.join(this.hlsDir, `${streamKey}.m3u8`);
    const hlsUrl = `/live/${streamKey}.m3u8`;
    const now = Date.now();

    const existing = this.streams.get(streamKey);

    if (existing) {
      existing.lastAccessTime = now;

      // If process is active and running, return current status
      if (existing.process && existing.process.exitCode === null && !existing.process.killed) {
        this.updateStreamStatus(existing);
        return {
          streamKey,
          hlsPath,
          hlsUrl,
          status: existing.status,
        };
      }
    }

    // Check capacity before spawning a new stream
    this.enforceCapacityLimit(streamKey);

    // Spawn stream worker
    const streamSource = this.getValidStreamSource(camera);
    if (!streamSource) {
      return { streamKey, hlsPath, hlsUrl, status: 'offline' };
    }

    this.startWorker(camera, streamKey, streamSource, profile);

    const streamState = this.streams.get(streamKey);
    return {
      streamKey,
      hlsPath,
      hlsUrl,
      status: streamState ? streamState.status : 'starting',
    };
  }

  /**
   * Spawn FFmpeg worker for stream conversion.
   */
  private startWorker(camera: Camera, streamKey: string, streamSource: string, profile: string) {
    this.ensureHlsDir();

    const now = Date.now();
    const existing = this.streams.get(streamKey);
    const restartCount = existing ? existing.restartCount + 1 : 0;
    const maskedSource = this.maskCredentials(streamSource);
    const hlsPath = path.join(this.hlsDir, `${streamKey}.m3u8`);

    const logList: string[] = [
      `[${new Date().toLocaleTimeString()}] Starting media worker for ${camera.name || streamKey}`,
      `Source: ${maskedSource}`,
    ];

    const isRtsp = streamSource.startsWith('rtsp://') || (camera.protocol && camera.protocol.toUpperCase() === 'RTSP');

    const ffmpegArgs: string[] = [
      '-fflags', '+nobuffer+discardcorrupt+genpts',
      '-flags', 'low_delay',
    ];

    if (isRtsp) {
      ffmpegArgs.push(
        '-rtsp_transport', 'tcp',
        '-stimeout', '10000000',
        '-use_wallclock_as_timestamps', '1',
        '-avoid_negative_ts', 'make_zero',
        '-analyzeduration', '2000000',
        '-probesize', '2000000',
        '-i', streamSource,
        '-map', '0:v:0?',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-pix_fmt', 'yuv420p',
        '-g', '30',
        '-crf', '26',
        '-map', '0:a:0?',
        '-c:a', 'aac',
        '-ac', '2',
        '-ar', '44100',
        '-b:a', '64k'
      );
    } else {
      if (streamSource.startsWith('http://') || streamSource.startsWith('https://')) {
        ffmpegArgs.push(
          '-reconnect', '1',
          '-reconnect_at_eof', '1',
          '-reconnect_streamed', '1',
          '-reconnect_delay_max', '5'
        );
      }
      ffmpegArgs.push(
        '-analyzeduration', '1500000',
        '-probesize', '1500000',
        '-i', streamSource,
        '-map', '0:v:0?',
        '-c:v', 'copy',
        '-map', '0:a:0?',
        '-c:a', 'aac',
        '-ac', '2',
        '-ar', '44100',
        '-b:a', '128k'
      );
    }

    ffmpegArgs.push(
      '-f', 'hls',
      '-hls_time', String(this.hlsSegmentSeconds),
      '-hls_list_size', String(this.hlsListSize),
      '-hls_flags', 'delete_segments+omit_endlist+discont_start',
      '-y',
      hlsPath
    );

    const streamState: StreamState = {
      streamKey,
      camera,
      rawSource: streamSource,
      maskedSource,
      process: null,
      startTime: now,
      lastAccessTime: now,
      restartCount,
      lastRestartTime: now,
      status: 'starting',
      lastError: null,
      logs: logList,
    };

    console.log(`[StreamManager] Starting FFmpeg stream worker for camera '${camera.name || camera.id}' (${streamKey}) via ${maskedSource}...`);

    try {
      const proc = spawn(this.ffmpegPath, ffmpegArgs);
      streamState.process = proc;

      proc.stderr.on('data', (chunk: Buffer) => {
        const line = chunk.toString().trim();
        if (line) {
          // Mask sensitive URLs in FFmpeg output lines
          const safeLine = this.maskCredentials(line);
          logList.push(safeLine);
          if (logList.length > 30) logList.shift();

          if (safeLine.includes('Invalid data found') || safeLine.includes('Decoder') || safeLine.includes('HEVC') || safeLine.includes('h265')) {
            streamState.lastError = safeLine;
          }
        }
      });

      proc.on('exit', (code) => {
        const runTimeMs = Date.now() - streamState.startTime;
        console.log(`[StreamManager] Stream worker for '${streamKey}' exited with code ${code} after ${Math.round(runTimeMs / 1000)}s`);
        logList.push(`Process exited with code ${code}`);

        if (code !== 0 && runTimeMs < 3000) {
          streamState.status = 'codecUnsupported';
          streamState.lastError = `FFmpeg worker exited rapidly (code ${code}). Stream source or codec may be incompatible.`;
        } else {
          streamState.status = 'offline';
        }
        streamState.process = null;
      });

      proc.on('error', (err) => {
        console.error(`[StreamManager] FFmpeg process spawn error for '${streamKey}':`, err.message);
        logList.push(`FFmpeg error: ${err.message}`);
        streamState.lastError = err.message;
        streamState.status = 'offline';
        streamState.process = null;
      });

      this.streams.set(streamKey, streamState);
    } catch (err: any) {
      console.error(`[StreamManager] Failed to launch worker for '${streamKey}':`, err);
      streamState.lastError = err?.message || String(err);
      streamState.status = 'offline';
      this.streams.set(streamKey, streamState);
    }
  }

  /**
   * Check capacity limit (MAX_ACTIVE_STREAMS). Stops least recently used stream if needed.
   */
  private enforceCapacityLimit(excludeKey: string) {
    const activeStreams = Array.from(this.streams.values()).filter(
      (s) => s.process && s.process.exitCode === null && !s.process.killed
    );

    if (activeStreams.length < this.maxActiveStreams) return;

    // Sort active streams by lastAccessTime ascending
    activeStreams.sort((a, b) => a.lastAccessTime - b.lastAccessTime);

    for (const stream of activeStreams) {
      if (stream.streamKey !== excludeKey) {
        console.log(`[StreamManager] Capacity limit reached (${this.maxActiveStreams}). Evicting idle stream '${stream.streamKey}'...`);
        this.stopStream(stream.streamKey);
        break;
      }
    }
  }

  /**
   * Stop worker process for a specific streamKey.
   */
  public stopStream(streamKey: string) {
    const stream = this.streams.get(streamKey);
    if (!stream) return;

    if (stream.process) {
      try {
        stream.process.kill('SIGTERM');
      } catch (e) {
        try { stream.process.kill('SIGKILL'); } catch (err) {}
      }
      stream.process = null;
    }

    stream.status = 'offline';
    console.log(`[StreamManager] Stopped stream worker for '${streamKey}'`);
  }

  /**
   * Touch stream to update lastAccessTime.
   */
  public touchStream(streamKey: string) {
    const cleanKey = streamKey.replace(/^cam-/, 'cam_');
    const stream = this.streams.get(cleanKey) || this.streams.get(streamKey);
    if (stream) {
      stream.lastAccessTime = Date.now();
    }
  }

  /**
   * Evaluate health status for a stream state.
   */
  private updateStreamStatus(stream: StreamState): StreamHealthStatus {
    if (!stream.process || stream.process.exitCode !== null || stream.process.killed) {
      if (stream.status !== 'codecUnsupported') {
        stream.status = 'offline';
      }
      return stream.status;
    }

    const hlsPath = path.join(this.hlsDir, `${stream.streamKey}.m3u8`);
    if (!fs.existsSync(hlsPath)) {
      stream.status = 'starting';
      return stream.status;
    }

    try {
      const stats = fs.statSync(hlsPath);
      const mtimeMs = stats.mtimeMs;
      const now = Date.now();

      if (now - mtimeMs < 15000) {
        stream.status = 'online';
      } else {
        stream.status = 'stalled';
      }
    } catch (e) {
      stream.status = 'stalled';
    }

    return stream.status;
  }

  /**
   * Get health metrics for a camera by streamKey or camera ID.
   */
  public getHealth(streamKeyOrCamId: string): StreamHealth {
    const cleanKey = streamKeyOrCamId.replace(/^cam-/, 'cam_');
    let stream = this.streams.get(cleanKey) || this.streams.get(streamKeyOrCamId);

    if (!stream) {
      // Find by camera ID matching
      for (const s of this.streams.values()) {
        if (s.camera.id === streamKeyOrCamId || s.camera.id === cleanKey || s.camera.streamKey === cleanKey) {
          stream = s;
          break;
        }
      }
    }

    if (!stream) {
      return {
        streamKey: cleanKey,
        cameraId: streamKeyOrCamId,
        cameraName: streamKeyOrCamId,
        protocol: 'RTSP/RTMP',
        status: 'offline',
        hlsUrl: `/live/${cleanKey}.m3u8`,
        uptime: 0,
        restartCount: 0,
        lastError: 'Stream not initialized',
        maskedSource: '',
        lastAccessTime: 0,
        logs: [],
      };
    }

    const status = this.updateStreamStatus(stream);
    const uptime = stream.startTime > 0 ? Math.round((Date.now() - stream.startTime) / 1000) : 0;

    return {
      streamKey: stream.streamKey,
      cameraId: stream.camera.id || stream.streamKey,
      cameraName: stream.camera.name || stream.streamKey,
      protocol: stream.camera.protocol || 'RTSP/RTMP',
      status,
      hlsUrl: `/live/${stream.streamKey}.m3u8`,
      uptime,
      restartCount: stream.restartCount,
      lastError: stream.lastError,
      maskedSource: stream.maskedSource,
      lastAccessTime: stream.lastAccessTime,
      logs: stream.logs,
    };
  }

  /**
   * Get health status for all active streams.
   */
  public getAllHealth(): Record<string, StreamHealth> {
    const healthMap: Record<string, StreamHealth> = {};
    for (const key of this.streams.keys()) {
      healthMap[key] = this.getHealth(key);
    }
    return healthMap;
  }

  /**
   * Housekeeping task: check for stalled/idle processes.
   */
  private housekeeping() {
    const now = Date.now();
    for (const [key, stream] of this.streams.entries()) {
      if (stream.process && stream.process.exitCode === null && !stream.process.killed) {
        // Check if stream has been idle for longer than idleTimeoutMs
        if (now - stream.lastAccessTime > this.idleTimeoutMs) {
          console.log(`[StreamManager Idle Reaper] Stream '${key}' idle for ${Math.round((now - stream.lastAccessTime) / 1000)}s. Stopping worker.`);
          this.stopStream(key);
        } else {
          this.updateStreamStatus(stream);
        }
      }
    }
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    for (const key of this.streams.keys()) {
      this.stopStream(key);
    }
  }
}

export const streamManager = new StreamManager();
