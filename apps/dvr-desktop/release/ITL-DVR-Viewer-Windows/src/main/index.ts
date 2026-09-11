import { app, BrowserWindow, ipcMain, Tray, Menu, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { SecurityVault, UserSession } from './security-vault';

// Performance & GPU acceleration switches
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let vault: SecurityVault;
let isQuitting = false;

function readPreloadedConfig(): Record<string, any> {
  const candidatePaths = [
    path.join((process as any).resourcesPath || '', 'dvr-config.json'),
    path.join(path.dirname(process.execPath), 'dvr-config.json'),
    path.join(app.getAppPath(), 'dvr-config.json'),
    path.join(app.getPath('userData'), 'dvr-config.json'),
    path.join(process.cwd(), 'dvr-config.json'),
    path.join(__dirname, '../../dvr-config.json'),
    path.join(__dirname, '../dvr-config.json'),
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
  return {
    serverUrl: 'https://centralitl.unityautomacoes.com.br',
    systemName: 'Central ITL de Câmeras & Monitoramento',
    mode: 'DVR_VIEWER',
    cloudRecording: true,
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Central ITL - Visualizador DVR Nativo (Gravação em Nuvem)',
    backgroundColor: '#090d16',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Allows cross-origin video feeds from central cameras without browser CORS restrictions
    },
  });

  const htmlPathInDist = path.join(__dirname, '../renderer/index.html');
  const htmlPathInSrc = path.join(__dirname, '../../src/renderer/index.html');
  const finalHtmlPath = fs.existsSync(htmlPathInDist) ? htmlPathInDist : htmlPathInSrc;
  mainWindow.loadFile(finalHtmlPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // F11 Toggle Fullscreen
  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      const isFull = mainWindow?.isFullScreen();
      mainWindow?.setFullScreen(!isFull);
    }
    if (input.key === 'Escape' && input.type === 'keyDown' && mainWindow?.isFullScreen()) {
      mainWindow?.setFullScreen(false);
    }
  });

  mainWindow.on('close', (event: any) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function setupTray() {
  try {
    const iconPath = path.join(__dirname, '../renderer/assets/icon.png');
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Abrir Visualizador DVR',
          click: () => {
            mainWindow?.show();
            mainWindow?.focus();
          },
        },
        {
          label: 'Alternar Tela Cheia (F11)',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Sair e Encerrar',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ]);
      tray.setToolTip('Central ITL - Visualizador DVR Nativo');
      tray.setContextMenu(contextMenu);
      tray.on('double-click', () => {
        mainWindow?.show();
        mainWindow?.focus();
      });
    }
  } catch (e) {
    // tray fallback
  }
}

app.whenReady().then(() => {
  vault = new SecurityVault(app.getPath('userData'));
  createWindow();
  setupTray();
  setupIpcHandlers();
});

function setupIpcHandlers() {
  // App Config
  ipcMain.handle('app:get-config', async () => {
    return readPreloadedConfig();
  });

  // Auth: Get Saved Session
  ipcMain.handle('auth:get-session', async () => {
    const session = vault.loadSession();
    const config = readPreloadedConfig();
    return {
      session,
      serverUrl: session?.serverUrl || config.serverUrl || 'https://centralitl.unityautomacoes.com.br',
      systemName: config.systemName || 'Central ITL de Câmeras & Monitoramento',
      cloudRecording: true,
    };
  });

  // Auth: Login
  ipcMain.handle('auth:login', async (_, payload: { serverUrl: string; email: string; password?: string }) => {
    try {
      const cleanUrl = payload.serverUrl.trim().replace(/\/$/, '');
      const loginEndpoint = `${cleanUrl}/api/v1/auth/login`;

      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || `Erro HTTP ${response.status}: Falha no login` };
      }

      const session: UserSession = {
        serverUrl: cleanUrl,
        token: data.token,
        user: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          companyId: data.user.companyId,
        },
        expiresAt: Date.now() + (data.expiresIn ? data.expiresIn * 1000 : 86400000),
      };

      vault.saveSession(session);
      return { success: true, user: session.user, token: session.token };
    } catch (err: any) {
      return { success: false, error: `Não foi possível conectar à Central: ${err.message}` };
    }
  });

  // Auth: Logout
  ipcMain.handle('auth:logout', async () => {
    vault.clear();
    return { success: true };
  });

  // Cameras: Get List
  ipcMain.handle('cameras:get-list', async () => {
    const session = vault.loadSession();
    if (!session) return { error: 'Usuário não autenticado', cameras: [] };

    try {
      const cleanUrl = session.serverUrl.replace(/\/$/, '');
      const camerasEndpoint = `${cleanUrl}/api/v1/cameras`;

      const res = await fetch(camerasEndpoint, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'x-user-id': session.user.id,
        },
      });

      if (!res.ok) {
        return { error: `HTTP ${res.status}`, cameras: [] };
      }

      const cameras = await res.json();
      return { success: true, cameras: Array.isArray(cameras) ? cameras : [] };
    } catch (err: any) {
      return { error: err.message, cameras: [] };
    }
  });

  // Cameras: PTZ
  ipcMain.handle('cameras:ptz', async (_, cameraId: string, action: string) => {
    const session = vault.loadSession();
    if (!session) return { success: false, error: 'Não autenticado' };

    try {
      const cleanUrl = session.serverUrl.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/api/v1/cameras/${cameraId}/ptz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
          'x-user-id': session.user.id,
        },
        body: JSON.stringify({ action }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Window Controls
  ipcMain.handle('window:toggle-fullscreen', () => {
    if (!mainWindow) return false;
    const isFull = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFull);
    return !isFull;
  });

  ipcMain.handle('window:is-fullscreen', () => {
    return mainWindow ? mainWindow.isFullScreen() : false;
  });

  // Save Snapshot Image
  ipcMain.handle('system:save-snapshot', async (_, payload: { dataUrl: string; cameraName: string }) => {
    try {
      const base64Data = payload.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const cleanName = (payload.cameraName || 'camera').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `snapshot_${cleanName}_${timestamp}.jpg`;

      const picturesDir = app.getPath('pictures');
      const targetDir = path.join(picturesDir, 'ITL_Snapshots');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const fullPath = path.join(targetDir, filename);
      fs.writeFileSync(fullPath, buffer);
      return { success: true, path: fullPath };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Start on Boot
  ipcMain.handle('system:set-start-on-boot', (_, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      args: ['--hidden'],
    });
    return true;
  });

  ipcMain.handle('system:get-start-on-boot', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });
}

app.on('before-quit', () => {
  isQuitting = true;
});
