// Central ITL - Visualizador DVR Nativo (Main Process)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { SecurityVault } = require('./security-vault');

// Performance & GPU acceleration switches
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
// Increase maximum concurrent connections per host from 6 to 64 for 16x16 / multi-camera CCTV monitoring
app.commandLine.appendSwitch('max-connections-per-server', '64');
app.commandLine.appendSwitch('max-sockets-per-group', '64');
app.commandLine.appendSwitch('max-sockets-per-proxy-server', '64');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let tray = null;
let vault = null;
let isQuitting = false;

function readPreloadedConfig() {
  const candidatePaths = [
    path.join(process.resourcesPath || '', 'dvr-config.json'),
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

function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, '../main/preload.js'),
    path.join(app.getAppPath(), 'dist/main/preload.js'),
    path.join(app.getAppPath(), 'src/main/preload.js'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || path.join(__dirname, 'preload.js');
}

function resolveHtmlPath() {
  const candidates = [
    path.join(__dirname, '../renderer/index.html'),
    path.join(__dirname, '../../src/renderer/index.html'),
    path.join(app.getAppPath(), 'dist/renderer/index.html'),
    path.join(app.getAppPath(), 'src/renderer/index.html'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || path.join(__dirname, '../renderer/index.html');
}

function createWindow() {
  const preloadScript = resolvePreloadPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Central ITL - Visualizador DVR Nativo (Gravação em Nuvem)',
    backgroundColor: '#090d16',
    show: false,
    webPreferences: {
      preload: preloadScript,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  const finalHtmlPath = resolveHtmlPath();
  mainWindow.loadFile(finalHtmlPath);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) mainWindow.show();
  });

  // F11 Fullscreen & F12 DevTools
  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      const isFull = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFull);
    }
    if (input.key === 'Escape' && input.type === 'keyDown' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
    if ((input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      if (mainWindow) mainWindow.hide();
    }
  });
}

function setupTray() {
  try {
    const iconCandidates = [
      path.join(__dirname, '../renderer/assets/icon.png'),
      path.join(app.getAppPath(), 'src/renderer/assets/icon.png'),
      path.join(app.getAppPath(), 'dist/renderer/assets/icon.png'),
    ];
    const iconPath = iconCandidates.find((p) => fs.existsSync(p));
    if (iconPath) {
      tray = new Tray(iconPath);
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Abrir Visualizador DVR',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
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
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
    }
  } catch (e) {
    // tray fallback
  }
}

app.whenReady().then(() => {
  vault = new SecurityVault(app.getPath('userData'));
  setupIpcHandlers();
  createWindow();
  setupTray();
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
  ipcMain.handle('auth:login', async (_, payload) => {
    try {
      const cleanUrl = (payload?.serverUrl || '').trim().replace(/\/$/, '');
      if (!cleanUrl) {
        return { success: false, error: 'URL da Central ITL não informada.' };
      }

      const loginPayload = {
        email: payload.email,
        username: payload.email,
        password: payload.password,
      };

      let response = null;
      let usedEndpoint = `${cleanUrl}/api/v1/auth/login`;

      const fetchWithTimeout = async (url, body, timeoutMs = 9000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return res;
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      };

      try {
        response = await fetchWithTimeout(usedEndpoint, loginPayload);
      } catch (err) {
        // Fallback endpoint
        usedEndpoint = `${cleanUrl}/api/auth/login`;
        try {
          response = await fetchWithTimeout(usedEndpoint, loginPayload);
        } catch (secondErr) {
          return {
            success: false,
            error: `Não foi possível alcançar o servidor em "${cleanUrl}". Verifique a conexão com a internet ou se o endereço está correto (${secondErr.message})`,
          };
        }
      }

      if (!response.ok && response.status === 404) {
        try {
          response = await fetchWithTimeout(`${cleanUrl}/api/auth/login`, loginPayload);
        } catch (e) {
          // ignore
        }
      }

      const data = await response.json().catch(() => ({
        success: false,
        error: `Resposta inválida da Central (Status ${response?.status})`,
      }));

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Erro de autenticação (HTTP ${response.status}): Credenciais incorretas ou acesso negado.`,
        };
      }

      const session = {
        serverUrl: cleanUrl,
        token: data.token,
        user: {
          id: data.user?.id || 'admin',
          name: data.user?.name || 'Administrador',
          email: data.user?.email || payload.email,
          role: data.user?.role || 'USER',
          companyId: data.user?.companyId || null,
        },
        expiresAt: Date.now() + (data.expiresIn ? data.expiresIn * 1000 : 86400000),
      };

      vault.saveSession(session);
      return { success: true, user: session.user, token: session.token };
    } catch (err) {
      return { success: false, error: `Erro na comunicação com a Central: ${err.message}` };
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
      let camerasEndpoint = `${cleanUrl}/api/v1/cameras`;

      let res = await fetch(camerasEndpoint, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'x-user-id': session.user.id,
        },
      }).catch(() => null);

      if (!res || !res.ok) {
        camerasEndpoint = `${cleanUrl}/api/cameras`;
        res = await fetch(camerasEndpoint, {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'x-user-id': session.user.id,
          },
        });
      }

      if (!res.ok) {
        return { error: `HTTP ${res.status}`, cameras: [] };
      }

      const cameras = await res.json();
      return { success: true, cameras: Array.isArray(cameras) ? cameras : [] };
    } catch (err) {
      return { error: err.message, cameras: [] };
    }
  });

  // Cameras: PTZ
  ipcMain.handle('cameras:ptz', async (_, cameraId, action) => {
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
    } catch (err) {
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
  ipcMain.handle('system:save-snapshot', async (_, payload) => {
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
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Start on Boot
  ipcMain.handle('system:set-start-on-boot', (_, enabled) => {
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
