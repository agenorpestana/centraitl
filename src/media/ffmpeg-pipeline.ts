import path from 'path';

export interface CameraStreamConfig {
  id: string;
  name?: string;
  protocol?: 'RTSP' | 'RTMP' | 'HTTP' | 'ONVIF' | string;
  rtspUrl?: string;
  rtmpUrl?: string;
  subStreamUrl?: string;
  videoStreamUrl?: string;
  streamKey?: string;
  fullRtmpUrl?: string;
}

export interface StreamPipelineOptions {
  isSubStream?: boolean;
  hlsDir?: string;
  hlsTimeSec?: number;
  hlsListSize?: number;
  preferHardwareCopyForSub?: boolean;
}

export interface RecordingPipelineOptions {
  durationSec?: number;
  recordingsDir?: string;
  segmentPrefix?: string;
}

export interface Mp4RepairOptions {
  faststart?: boolean;
  stripAudioIfDamaged?: boolean;
}

/**
 * Masks credentials in stream URLs so they are never printed in logs or UI
 * e.g. rtsp://admin:secret123@192.168.1.100:554/stream -> rtsp://admin:***@192.168.1.100:554/stream
 */
export function maskSensitiveUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/([a-zA-Z]+:\/\/[^:]+:)([^@]+)(@)/, '$1***$3');
}

/**
 * Sanitizes an ID for safe use in local file paths, avoiding path traversal or invalid characters.
 */
export function sanitizeIdentifier(rawId: string): string {
  if (!rawId) return 'unknown';
  return String(rawId)
    .replace(/^cam[-_]/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'stream';
}

/**
 * Validates that a file path stays strictly within the authorized base directory (prevents path traversal).
 */
export function isSafePathInsideDirectory(targetPath: string, baseDirectory: string): boolean {
  if (!targetPath || !baseDirectory) return false;
  const resolvedBase = path.resolve(baseDirectory);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

/**
 * Determines stream input source with RTSP and RTMP specific handling.
 * RTSP has priority for RTSP cameras; RTMP has priority for RTMP cameras.
 */
export function resolveStreamSource(cam: CameraStreamConfig, isSubStream = false): string {
  if (!cam) return '';

  const cleanKey = sanitizeIdentifier(cam.streamKey || cam.id || 'stream');
  const defaultRtmpKey = `cam_${cleanKey}`;

  // 1. Explicit RTSP priority
  if (cam.protocol === 'RTSP' || (cam.rtspUrl && cam.rtspUrl.trim().length > 0)) {
    if (isSubStream && cam.subStreamUrl && cam.subStreamUrl.trim().length > 0) {
      const sub = cam.subStreamUrl.trim();
      return sub.startsWith('rtsp://') || sub.startsWith('http://') || sub.startsWith('https://') ? sub : `rtsp://${sub}`;
    }
    if (cam.rtspUrl && cam.rtspUrl.trim().length > 0) {
      const main = cam.rtspUrl.trim();
      return main.startsWith('rtsp://') || main.startsWith('http://') || main.startsWith('https://') ? main : `rtsp://${main}`;
    }
  }

  // 2. Direct external HTTP/HTTPS stream URL
  if (cam.videoStreamUrl && typeof cam.videoStreamUrl === 'string' && cam.videoStreamUrl.trim()) {
    const vUrl = cam.videoStreamUrl.trim();
    if (
      (vUrl.startsWith('http://') || vUrl.startsWith('https://') || vUrl.startsWith('rtsp://')) &&
      !vUrl.includes('/live/cam_') &&
      !vUrl.includes(':3000/live/')
    ) {
      return vUrl;
    }
  }

  // 3. RTMP candidate check
  if (cam.protocol === 'RTMP' || cam.rtmpUrl || cam.fullRtmpUrl) {
    const candidates = [cam.rtmpUrl, cam.fullRtmpUrl].filter(Boolean) as string[];
    for (const cand of candidates) {
      let str = cand.trim();
      if (str.startsWith('rtmp://')) {
        const urlNoScheme = str.replace(/^rtmp:\/\//, '');
        const segments = urlNoScheme.split('/').filter(Boolean);
        if (segments.length <= 2 || str.endsWith('/live') || str.endsWith('/live/')) {
          str = `${str.replace(/\/$/, '')}/${defaultRtmpKey}`;
        }
        return str;
      }
    }
  }

  // 4. Fallback RTSP if present
  if (cam.rtspUrl && cam.rtspUrl.trim()) {
    const rtsp = cam.rtspUrl.trim();
    return rtsp.startsWith('rtsp://') ? rtsp : `rtsp://${rtsp}`;
  }

  return `rtmp://monitoramento.unityautomacoes.com.br:1935/live/${defaultRtmpKey}`;
}

/**
 * Builds array of FFmpeg arguments for live HLS stream ingestion and normalization.
 * RTMP uses -c:v copy (STABLE & PRESERVED).
 * RTSP normalizes to H.264 Baseline/Main, YUV420p with low latency and TCP transport.
 */
export function buildLiveStreamArgs(
  cam: CameraStreamConfig,
  options: StreamPipelineOptions = {}
): { args: string[]; outputHlsPath: string; streamSource: string } {
  const isSub = Boolean(options.isSubStream);
  const streamSource = resolveStreamSource(cam, isSub);
  const cleanKey = sanitizeIdentifier(cam.streamKey || cam.id || 'stream');
  const streamIdentifier = isSub ? `cam_${cleanKey}_sub` : `cam_${cleanKey}`;
  const hlsDir = options.hlsDir || '/tmp/hls';
  const outputHlsPath = path.join(hlsDir, `${streamIdentifier}.m3u8`);
  const segmentPattern = path.join(hlsDir, `${streamIdentifier}_%05d.ts`);

  const args: string[] = [
    '-fflags', '+nobuffer+discardcorrupt+genpts',
    '-flags', 'low_delay'
  ];

  if (streamSource.startsWith('rtsp://')) {
    args.push(
      '-rtsp_transport', 'tcp',
      '-stimeout', '15000000',
      '-analyzeduration', '500000',
      '-probesize', '500000'
    );
  } else if (streamSource.startsWith('rtmp://')) {
    args.push(
      '-rw_timeout', '15000000',
      '-analyzeduration', '500000',
      '-probesize', '500000'
    );
  } else if (streamSource.startsWith('http://') || streamSource.startsWith('https://')) {
    args.push(
      '-reconnect', '1',
      '-reconnect_at_eof', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5'
    );
  }

  args.push('-i', streamSource, '-map', '0:v:0?');

  const isRtmp = streamSource.startsWith('rtmp://');

  if (isSub) {
    if (isRtmp) {
      // RTMP remains copy for maximum stability
      args.push('-c:v', 'copy');
    } else {
      // Universal RTSP sub-stream normalization (SD 360p Baseline H.264)
      args.push(
        '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-pix_fmt', 'yuv420p',
        '-threads', '1',
        '-r', '30',
        '-g', '30',
        '-keyint_min', '30',
        '-sc_threshold', '0',
        '-b:v', '500k',
        '-maxrate', '700k',
        '-bufsize', '700k',
        '-max_muxing_queue_size', '2048'
      );
    }
  } else {
    // Main stream
    if (isRtmp) {
      // RTMP -c copy PRESERVED
      args.push('-c:v', 'copy');
    } else {
      // RTSP normalized to H.264 Main Profile
      args.push(
        '-vf', 'format=yuv420p',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-profile:v', 'main',
        '-level', '4.1',
        '-pix_fmt', 'yuv420p',
        '-threads', '2',
        '-r', '30',
        '-g', '30',
        '-keyint_min', '30',
        '-sc_threshold', '0',
        '-b:v', '2000k',
        '-maxrate', '2500k',
        '-bufsize', '3000k',
        '-max_muxing_queue_size', '2048'
      );
    }
  }

  const hlsTime = String(options.hlsTimeSec || 1);
  const hlsListSize = String(options.hlsListSize || 5);

  args.push(
    '-an',
    '-f', 'hls',
    '-hls_time', hlsTime,
    '-hls_list_size', hlsListSize,
    '-hls_flags', 'delete_segments+omit_endlist+split_by_time',
    '-hls_segment_type', 'mpegts',
    '-hls_segment_filename', segmentPattern,
    '-y',
    outputHlsPath
  );

  return { args, outputHlsPath, streamSource };
}

/**
 * Builds array of FFmpeg arguments for 24/7 continuous segmented recording.
 * Creates playable fragmented MP4 slices that do not corrupt even upon abrupt power loss.
 */
export function buildRecordingArgs(
  cam: CameraStreamConfig,
  targetPartPath: string,
  options: RecordingPipelineOptions = {}
): { args: string[]; streamSource: string } {
  const durationSec = options.durationSec || 300;
  const streamSource = resolveStreamSource(cam, false);

  const args: string[] = [
    '-y',
    '-avoid_negative_ts', 'make_zero',
    '-fflags', '+genpts+discardcorrupt',
    '-threads', '1',
  ];

  if (streamSource.startsWith('rtsp://')) {
    args.push(
      '-rtsp_transport', 'tcp',
      '-stimeout', '20000000',
      '-analyzeduration', '1000000',
      '-probesize', '1000000'
    );
  } else if (streamSource.startsWith('rtmp://')) {
    args.push(
      '-rw_timeout', '20000000',
      '-analyzeduration', '1000000',
      '-probesize', '1000000'
    );
  } else if (streamSource.startsWith('http://') || streamSource.startsWith('https://')) {
    args.push(
      '-reconnect', '1',
      '-reconnect_at_eof', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5'
    );
  }

  args.push(
    '-i', streamSource,
    '-map', '0:v:0',
    '-c:v', 'copy',
    '-an',
    '-max_muxing_queue_size', '4096',
    '-movflags', '+frag_keyframe+empty_moov+default_base_moof',
    '-t', durationSec.toString(),
    targetPartPath
  );

  return { args, streamSource };
}

/**
 * Builds repair and finalization arguments for MP4 slices (moov atom faststart).
 */
export function buildMp4RepairArgs(inputPath: string, tempOutputPath: string, attempt: 1 | 2): string[] {
  if (attempt === 1) {
    return [
      '-y',
      '-err_detect', 'ignore_err',
      '-i', inputPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      tempOutputPath
    ];
  }
  return [
    '-y',
    '-err_detect', 'ignore_err',
    '-i', inputPath,
    '-map', '0:v:0?',
    '-c:v', 'copy',
    '-an',
    '-movflags', '+faststart',
    tempOutputPath
  ];
}
