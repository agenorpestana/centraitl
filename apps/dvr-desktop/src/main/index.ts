import { app, BrowserWindow, ipcMain, Tray, Menu, clipboard } from 'electron';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import { SecurityVault, AgentCredentials } from './security-vault';
import { AgentCore } from './agent-core';
import { RegisterAgentPayload } from './preload';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let vault: SecurityVault;
let agentCore: AgentCore | null = null;
let isQuitting = false;

function generateDeviceId(): string {
  const host = os.hostname();
  const network = JSON.stringify(os.networkInterfaces());
  return crypto.createHash('sha256').update(`${host}_${network}`).digest('hex').substring(0, 16);
}

function readPreloadedConfig(): Record<string, any> {
  const candidatePaths = [
    path.join((process as any).resourcesPath || '', 'dvr-config.json'),
    path.join(path.dirname(process.execPath), 'dvr-config.json'),
    path.join(app.getAppPath(), 'dvr-config.json'),
    path.join(app.getPath('userData'), 'dvr-config.json'),
    path.join(process.cwd(), 'dvr-config.json'),
    path.join(__dirname, '../../dvr-config.json'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
  }
  return {};
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'ITL DVR Agent - Monitoramento & Gravação Local',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const htmlPathInDist = path.join(__dirname, '../renderer/index.html');
  const htmlPathInSrc = path.join(__dirname, '../../src/renderer/index.html');
  const finalHtmlPath = fs.existsSync(htmlPathInDist) ? htmlPathInDist : htmlPathInSrc;
  mainWindow.loadFile(finalHtmlPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Minimize to tray instead of exiting
  mainWindow.on('close', (event: any) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function setupTray() {
  // Empty tray icon fallback if icon asset not found
  try {
    const iconPath = path.join(__dirname, '../renderer/assets/icon.png');
    tray = new Tray(iconPath);
  } catch (e) {
    // If icon file doesn't exist, Electron gracefully creates tray or fails without crashing app
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Painel do DVR',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Sincronizar Câmeras',
      click: () => {
        agentCore?.syncCamerasFromServer();
      },
    },
    { type: 'separator' },
    {
      label: 'Sair e Encerrar DVR',
      click: () => {
        isQuitting = true;
        agentCore?.stop();
        app.quit();
      },
    },
  ]);

  if (tray) {
    tray.setToolTip('ITL DVR Agent - Gravação Contínua');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
  }
}

app.whenReady().then(async () => {
  vault = new SecurityVault(app.getPath('userData'));
  const savedCreds = vault.loadCredentials();

  createWindow();
  setupTray();

  if (savedCreds) {
    agentCore = new AgentCore(savedCreds);
    const initRes = await agentCore.init();
    if (initRes.success) {
      await agentCore.start();
    }
  }

  setupIpcHandlers();
});

function setupIpcHandlers() {
  ipcMain.handle('agent:get-status', async () => {
    const creds = vault.loadCredentials();
    const prefill = readPreloadedConfig();
    return {
      isConfigured: Boolean(creds),
      agentId: creds?.agentId || null,
      deviceId: creds?.deviceId || generateDeviceId(),
      serverUrl: creds?.serverUrl || prefill.serverUrl || 'https://monitoramento.unityautomacoes.com.br',
      recordingsDirectory: creds?.recordingsDirectory || path.join(app.getPath('videos'), 'ITL_Recordings'),
      retentionDays: creds?.retentionDays || prefill.retentionDays || 7,
      storageLimitGB: creds?.storageLimitGB || prefill.storageLimitGB || 100,
      isRunning: Boolean(agentCore),
      prefill,
    };
  });

  ipcMain.handle('agent:get-cameras', async () => {
    if (!agentCore) return [];
    return agentCore.getCameraStatuses();
  });

  ipcMain.handle('agent:get-diagnostics', async () => {
    if (!agentCore) {
      return {
        version: '1.0.0',
        os: `${os.type()} ${os.release()}`,
        uptimeSeconds: Math.round(process.uptime()),
        diskTotalGB: 0,
        diskFreeGB: 0,
        ffmpegAvailable: false,
        ffprobeAvailable: false,
        activeCamerasCount: 0,
        recordingCamerasCount: 0,
        offlineQueueCount: 0,
        recentLogs: ['Agente ainda não configurado ou aguardando autenticação.'],
      };
    }
    return agentCore.getDiagnosticInfo();
  });

  ipcMain.handle('agent:register', async (_: any, payload: RegisterAgentPayload) => {
    try {
      const deviceId = generateDeviceId();
      const registerUrl = `${payload.serverUrl.replace(/\/$/, '')}/api/v1/dvr-agents/register`;

      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          name: payload.agentName || os.hostname(),
          email: payload.email,
          password: payload.password,
          hostname: os.hostname(),
          os: `${os.type()} ${os.release()}`,
          retentionDays: payload.retentionDays || 7,
          storageLimitGB: payload.storageLimitGB || 100,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        return { success: false, error: errorData.error || `Erro HTTP ${response.status}` };
      }

      const data = await response.json();

      const creds: AgentCredentials = {
        serverUrl: payload.serverUrl,
        agentId: data.agent.id,
        deviceId,
        deviceToken: data.deviceToken,
        companyId: data.agent.companyId,
        retentionDays: payload.retentionDays || 7,
        storageLimitGB: payload.storageLimitGB || 100,
        recordingsDirectory: payload.recordingsDirectory || path.join(app.getPath('videos'), 'ITL_Recordings'),
      };

      vault.saveCredentials(creds);

      if (agentCore) {
        agentCore.stop();
      }

      agentCore = new AgentCore(creds);
      const initRes = await agentCore.init();
      if (!initRes.success) {
        return { success: false, error: initRes.error };
      }

      await agentCore.start();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha ao conectar com o servidor da Central' };
    }
  });

  ipcMain.handle('agent:logout', async () => {
    if (agentCore) {
      agentCore.stop();
      agentCore = null;
    }
    vault.clear();
    return { success: true };
  });

  ipcMain.handle('agent:set-start-on-boot', (_: any, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      args: ['--hidden'],
    });
    return true;
  });

  ipcMain.handle('agent:get-start-on-boot', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  ipcMain.handle('agent:copy-clean-diagnostics', async () => {
    const diag = agentCore ? agentCore.getDiagnosticInfo() : null;
    const cleanLogs = (diag?.recentLogs || []).map((l) =>
      l.replace(/rtsp:\/\/[^@]+@/g, 'rtsp://***@').replace(/Bearer\s+[a-zA-Z0-9._-]+/g, 'Bearer ***')
    );

    const report = [
      `=== ITL DVR AGENT DIAGNOSTIC REPORT ===`,
      `Date: ${new Date().toISOString()}`,
      `Version: ${diag?.version || '1.0.0'}`,
      `OS: ${diag?.os || os.type()}`,
      `FFmpeg Installed: ${diag?.ffmpegAvailable ? 'YES' : 'NO'}`,
      `FFprobe Installed: ${diag?.ffprobeAvailable ? 'YES' : 'NO'}`,
      `Disk Total: ${diag?.diskTotalGB || 0} GB | Free: ${diag?.diskFreeGB || 0} GB`,
      `Active Streams: ${diag?.activeCamerasCount || 0}`,
      `Recording Streams: ${diag?.recordingCamerasCount || 0}`,
      `Offline Queue Items: ${diag?.offlineQueueCount || 0}`,
      `\n--- Recent Sanitized Event Logs ---`,
      ...cleanLogs,
    ].join('\n');

    clipboard.writeText(report);
    return true;
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  if (agentCore) {
    agentCore.stop();
  }
});
