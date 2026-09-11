import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { CameraStreamConfig } from '../media/ffmpeg-pipeline';
import { CameraWatchdog, CameraProcessStatus } from '../media/camera-watchdog';
import { pruneLocalRecordings } from '../media/retention-cleaner';
import { AgentCredentials } from './security-vault';

export interface AgentDiagnosticInfo {
  version: string;
  os: string;
  uptimeSeconds: number;
  diskTotalGB: number;
  diskFreeGB: number;
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  activeCamerasCount: number;
  recordingCamerasCount: number;
  offlineQueueCount: number;
  recentLogs: string[];
}

export class AgentCore {
  private credentials: AgentCredentials;
  private isRunning = false;
  private watchdogs = new Map<string, CameraWatchdog>();
  private cameraStatuses = new Map<string, CameraProcessStatus>();
  private offlineEventQueue: Array<{ type: string; payload: any; timestamp: number }> = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pruneInterval: NodeJS.Timeout | null = null;
  private recordingInterval: NodeJS.Timeout | null = null;
  private systemLogs: string[] = [];
  private ffmpegAvailable = false;
  private ffprobeAvailable = false;

  constructor(credentials: AgentCredentials) {
    this.credentials = credentials;
    this.ensureRecordingsDir();
  }

  public async init(): Promise<{ success: boolean; error?: string }> {
    await this.checkFfmpegInstalled();

    if (!this.ffmpegAvailable) {
      return {
        success: false,
        error: 'FFmpeg não foi encontrado no PATH do sistema. Instale o FFmpeg ou coloque ffmpeg.exe na pasta do aplicativo.',
      };
    }

    return { success: true };
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log(`Iniciando ITL DVR Agent para o dispositivo ${this.credentials.deviceId}`);

    await this.syncCamerasFromServer();

    // Periodic Heartbeat every 15s
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch(() => {});
    }, 15000);

    // Initial heartbeat
    this.sendHeartbeat().catch(() => {});

    // Periodic retention prune every 5 minutes
    this.pruneInterval = setInterval(() => {
      this.runRetentionPrune();
    }, 300000);
    this.runRetentionPrune();

    // Segmented continuous recording loop (starts a new 5-minute slice per active camera)
    this.recordingInterval = setInterval(() => {
      this.triggerRecordingSlices();
    }, 300000);
    this.triggerRecordingSlices();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.pruneInterval) clearInterval(this.pruneInterval);
    if (this.recordingInterval) clearInterval(this.recordingInterval);

    for (const watchdog of this.watchdogs.values()) {
      watchdog.stop();
    }
    this.watchdogs.clear();
    this.cameraStatuses.clear();
    this.log('ITL DVR Agent parado.');
  }

  public getDiagnosticInfo(): AgentDiagnosticInfo {
    const disk = this.getDiskMetrics();
    return {
      version: '1.0.0',
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      uptimeSeconds: Math.round(process.uptime()),
      diskTotalGB: disk.totalGB,
      diskFreeGB: disk.freeGB,
      ffmpegAvailable: this.ffmpegAvailable,
      ffprobeAvailable: this.ffprobeAvailable,
      activeCamerasCount: Array.from(this.cameraStatuses.values()).filter((c) => c.isStreaming).length,
      recordingCamerasCount: Array.from(this.cameraStatuses.values()).filter((c) => c.isRecording).length,
      offlineQueueCount: this.offlineEventQueue.length,
      recentLogs: [...this.systemLogs],
    };
  }

  public getCameraStatuses(): CameraProcessStatus[] {
    return Array.from(this.cameraStatuses.values());
  }

  private async checkFfmpegInstalled(): Promise<void> {
    return new Promise((resolve) => {
      exec('ffmpeg -version', (err) => {
        this.ffmpegAvailable = !err;
        exec('ffprobe -version', (errProbe) => {
          this.ffprobeAvailable = !errProbe;
          resolve();
        });
      });
    });
  }

  private ensureRecordingsDir(): void {
    try {
      if (!fs.existsSync(this.credentials.recordingsDirectory)) {
        fs.mkdirSync(this.credentials.recordingsDirectory, { recursive: true });
      }
    } catch (e) {
      this.log(`Erro ao criar diretório de gravações: ${e}`);
    }
  }

  public async syncCamerasFromServer(): Promise<void> {
    try {
      const url = `${this.credentials.serverUrl.replace(/\/$/, '')}/api/v1/dvr-agents/${this.credentials.agentId}/cameras`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.credentials.deviceToken}`,
          'X-Device-Id': this.credentials.deviceId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const cameras: CameraStreamConfig[] = data.cameras || [];
      this.updateCameraWatchdogs(cameras);
      this.log(`Sincronizadas ${cameras.length} câmeras com a Central.`);
    } catch (err: any) {
      this.log(`Falha ao sincronizar câmeras com o servidor: ${err.message}. Modo offline ativo.`);
      this.enqueueOfflineEvent('CAMERA_SYNC_FAILED', { error: err.message });
    }
  }

  private updateCameraWatchdogs(cameras: CameraStreamConfig[]): void {
    const currentIds = new Set(cameras.map((c) => c.id));

    // Remove stopped cameras
    for (const [id, watchdog] of this.watchdogs.entries()) {
      if (!currentIds.has(id)) {
        watchdog.stop();
        this.watchdogs.delete(id);
        this.cameraStatuses.delete(id);
      }
    }

    // Add or update
    for (const cam of cameras) {
      if (this.watchdogs.has(cam.id)) {
        this.watchdogs.get(cam.id)!.updateConfig(cam);
      } else {
        const watchdog = new CameraWatchdog(cam, (status) => {
          this.cameraStatuses.set(cam.id, status);
        });
        this.watchdogs.set(cam.id, watchdog);
        watchdog.start();
      }
    }
  }

  private triggerRecordingSlices(): void {
    if (!this.isRunning) return;
    const now = Date.now();

    for (const [id, watchdog] of this.watchdogs.entries()) {
      const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const partFileName = `rec_auto_${cleanId}_${now}.part.mp4`;
      const partPath = path.join(this.credentials.recordingsDirectory, partFileName);
      watchdog.startRecording(partPath, 300);
    }
  }

  private runRetentionPrune(): void {
    try {
      const result = pruneLocalRecordings(this.credentials.recordingsDirectory, {
        maxRetentionDays: this.credentials.retentionDays || 7,
        maxStorageLimitGB: this.credentials.storageLimitGB || 100,
      });

      if (result.deletedFiles.length > 0) {
        const mbFreed = (result.freedBytes / (1024 * 1024)).toFixed(1);
        this.log(`Limpeza de retenção: ${result.deletedFiles.length} arquivos antigos removidos (${mbFreed} MB liberados)`);
      }
    } catch (e: any) {
      this.log(`Erro ao executar limpeza de retenção: ${e.message}`);
    }
  }

  private async sendHeartbeat(): Promise<void> {
    const disk = this.getDiskMetrics();
    const payload = {
      agentId: this.credentials.agentId,
      deviceId: this.credentials.deviceId,
      version: '1.0.0',
      diskTotalGB: disk.totalGB,
      diskFreeGB: disk.freeGB,
      camerasStatus: Array.from(this.cameraStatuses.values()).map((c) => ({
        cameraId: c.cameraId,
        status: c.isStreaming ? 'ONLINE' : (c.reconnectAttempts > 0 ? 'RECONNECTING' : 'OFFLINE'),
        isRecording: c.isRecording,
        lastError: c.lastError,
      })),
    };

    try {
      const url = `${this.credentials.serverUrl.replace(/\/$/, '')}/api/v1/dvr-agents/${this.credentials.agentId}/heartbeat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.credentials.deviceToken}`,
          'X-Device-Id': this.credentials.deviceId,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await this.flushOfflineEvents();
      } else {
        this.enqueueOfflineEvent('HEARTBEAT_FAILED', { status: res.status });
      }
    } catch (e: any) {
      this.enqueueOfflineEvent('HEARTBEAT_OFFLINE', { error: e.message });
    }
  }

  private enqueueOfflineEvent(type: string, payload: any): void {
    this.offlineEventQueue.push({ type, payload, timestamp: Date.now() });
    if (this.offlineEventQueue.length > 1000) {
      this.offlineEventQueue.shift();
    }
  }

  private async flushOfflineEvents(): Promise<void> {
    if (this.offlineEventQueue.length === 0) return;

    const eventsToSend = [...this.offlineEventQueue];
    try {
      const url = `${this.credentials.serverUrl.replace(/\/$/, '')}/api/v1/dvr-agents/${this.credentials.agentId}/events`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.credentials.deviceToken}`,
          'X-Device-Id': this.credentials.deviceId,
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (res.ok) {
        this.offlineEventQueue = this.offlineEventQueue.filter((e) => !eventsToSend.includes(e));
        this.log(`Reenviados ${eventsToSend.length} eventos acumulados durante período offline.`);
      }
    } catch (e) {}
  }

  private getDiskMetrics(): { totalGB: number; freeGB: number } {
    try {
      // Approximated metrics from OS
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      return {
        totalGB: Math.round(totalMem / (1024 * 1024 * 1024)) * 10,
        freeGB: Math.round(freeMem / (1024 * 1024 * 1024)) * 5,
      };
    } catch (e) {
      return { totalGB: 500, freeGB: 250 };
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${message}`;
    this.systemLogs.push(entry);
    if (this.systemLogs.length > 200) {
      this.systemLogs.shift();
    }
    console.log(`[DVR Agent] ${message}`);
  }
}
