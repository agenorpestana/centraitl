import { spawn, ChildProcess } from 'child_process';
import { CameraStreamConfig, maskSensitiveUrl, buildLiveStreamArgs, buildRecordingArgs } from './ffmpeg-pipeline';

export interface CameraProcessStatus {
  cameraId: string;
  name: string;
  isStreaming: boolean;
  isRecording: boolean;
  reconnectAttempts: number;
  lastError?: string;
  lastStartedAt?: number;
  bitrateKbps?: number;
  recentLogs: string[];
}

export type StatusChangeCallback = (status: CameraProcessStatus) => void;

export class CameraWatchdog {
  private camera: CameraStreamConfig;
  private isShuttingDown = false;
  private streamProc: ChildProcess | null = null;
  private recordProc: ChildProcess | null = null;
  private reconnectAttempts = 0;
  private restartTimeout: NodeJS.Timeout | null = null;
  private recentLogs: string[] = [];
  private onStatusChange?: StatusChangeCallback;

  constructor(camera: CameraStreamConfig, onStatusChange?: StatusChangeCallback) {
    this.camera = camera;
    this.onStatusChange = onStatusChange;
  }

  public updateConfig(camera: CameraStreamConfig) {
    this.camera = camera;
    this.restart();
  }

  public getStatus(): CameraProcessStatus {
    return {
      cameraId: this.camera.id,
      name: this.camera.name || this.camera.id,
      isStreaming: this.streamProc !== null && this.streamProc.exitCode === null && !this.streamProc.killed,
      isRecording: this.recordProc !== null && this.recordProc.exitCode === null && !this.recordProc.killed,
      reconnectAttempts: this.reconnectAttempts,
      recentLogs: [...this.recentLogs],
    };
  }

  public start(hlsDir = '/tmp/hls') {
    if (this.isShuttingDown) return;
    this.startStreamingProcess(hlsDir);
  }

  public startRecording(targetPartPath: string, durationSec = 300) {
    if (this.isShuttingDown) return;
    if (this.recordProc && this.recordProc.exitCode === null && !this.recordProc.killed) {
      return;
    }

    try {
      const { args, streamSource } = buildRecordingArgs(this.camera, targetPartPath, { durationSec });
      this.log(`Iniciando gravação contínua: ${maskSensitiveUrl(streamSource)}`);

      this.recordProc = spawn('ffmpeg', args);

      this.recordProc.stderr?.on('data', (chunk) => {
        const text = chunk.toString().trim();
        if (text) this.appendLog(text);
      });

      this.recordProc.on('exit', (code) => {
        this.log(`Processo de gravação finalizado (código ${code})`);
        this.recordProc = null;
        this.notifyStatus();
      });

      this.notifyStatus();
    } catch (err: any) {
      this.log(`Erro ao iniciar processo de gravação: ${err.message || err}`);
    }
  }

  public stop() {
    this.isShuttingDown = true;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.killProcess(this.streamProc);
    this.killProcess(this.recordProc);
    this.streamProc = null;
    this.recordProc = null;
    this.notifyStatus();
  }

  public restart() {
    this.isShuttingDown = false;
    this.killProcess(this.streamProc);
    this.streamProc = null;
    this.startStreamingProcess();
  }

  private startStreamingProcess(hlsDir = '/tmp/hls') {
    if (this.isShuttingDown) return;

    try {
      const { args, outputHlsPath, streamSource } = buildLiveStreamArgs(this.camera, { hlsDir });
      this.log(`Conectando stream: ${maskSensitiveUrl(streamSource)} -> ${outputHlsPath}`);

      const proc = spawn('ffmpeg', args);
      this.streamProc = proc;

      proc.stderr?.on('data', (chunk) => {
        const text = chunk.toString().trim();
        if (text) this.appendLog(text);
      });

      proc.on('exit', (code, signal) => {
        this.streamProc = null;
        if (this.isShuttingDown) return;

        this.reconnectAttempts++;
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, up to 60s max
        const delayMs = Math.min(60000, Math.pow(2, Math.min(this.reconnectAttempts, 6)) * 1000);
        this.log(`Stream desconectado (código ${code}, sinal ${signal}). Tentativa ${this.reconnectAttempts} em ${delayMs / 1000}s`);
        this.notifyStatus();

        this.restartTimeout = setTimeout(() => {
          this.startStreamingProcess(hlsDir);
        }, delayMs);
      });

      // Successful connection resets reconnect counter after 30s of stability
      setTimeout(() => {
        if (this.streamProc && this.streamProc.exitCode === null && !this.streamProc.killed) {
          this.reconnectAttempts = 0;
          this.notifyStatus();
        }
      }, 30000);

      this.notifyStatus();
    } catch (err: any) {
      this.log(`Falha ao spawnar FFmpeg: ${err.message || err}`);
    }
  }

  private killProcess(proc: ChildProcess | null) {
    if (!proc) return;
    try {
      if (proc.stdin && proc.stdin.writable) proc.stdin.write('q\n');
      proc.kill('SIGINT');
    } catch (e) {}
    setTimeout(() => {
      if (proc && proc.exitCode === null && !proc.killed) {
        try { proc.kill('SIGKILL'); } catch (e) {}
      }
    }, 1000);
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const masked = maskSensitiveUrl(message);
    this.appendLog(`[${timestamp}] ${masked}`);
  }

  private appendLog(line: string) {
    const masked = maskSensitiveUrl(line);
    this.recentLogs.push(masked);
    if (this.recentLogs.length > 50) {
      this.recentLogs.shift();
    }
  }

  private notifyStatus() {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus());
    }
  }
}
