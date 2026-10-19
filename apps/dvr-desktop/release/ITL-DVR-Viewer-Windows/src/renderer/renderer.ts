// Central ITL - Visualizador DVR Nativo
declare global {
  interface Window {
    exports?: any;
    module?: any;
    dvrApi: {
      getConfig: () => Promise<any>;
      getSession: () => Promise<any>;
      login: (payload: { serverUrl: string; email: string; password?: string }) => Promise<{ success: boolean; error?: string; user?: any; token?: string }>;
      logout: () => Promise<{ success: boolean }>;
      getCameras: () => Promise<{ success?: boolean; cameras: any[]; error?: string }>;
      triggerPtz: (cameraId: string, action: string) => Promise<any>;
      toggleFullscreen: () => Promise<boolean>;
      isFullscreen: () => Promise<boolean>;
      saveSnapshot: (payload: { dataUrl: string; cameraName: string }) => Promise<{ success: boolean; path?: string }>;
      setStartOnBoot: (enabled: boolean) => Promise<boolean>;
      getStartOnBoot: () => Promise<boolean>;
    };
  }
}

// DOM Elements
const loginSection = document.getElementById('loginSection') as HTMLDivElement;
const loginForm = document.getElementById('loginForm') as HTMLFormElement;
const loginError = document.getElementById('loginError') as HTMLDivElement;
const btnLoginSubmit = document.getElementById('btnLoginSubmit') as HTMLButtonElement;
const serverUrlInput = document.getElementById('serverUrl') as HTMLInputElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;

const dvrClock = document.getElementById('dvrClock') as HTMLDivElement;
const camCountLabel = document.getElementById('camCountLabel') as HTMLDivElement;
const videoGrid = document.getElementById('videoGrid') as HTMLDivElement;
const btnFullscreen = document.getElementById('btnFullscreen') as HTMLButtonElement;
const btnRefresh = document.getElementById('btnRefresh') as HTMLButtonElement;
const btnLogout = document.getElementById('btnLogout') as HTMLButtonElement;
const layoutButtons = document.querySelectorAll<HTMLButtonElement>('.layout-btn');

// State
let currentLayout: '1x1' | '2x2' | '3x3' | '4x4' = '2x2';
let previousLayoutBeforeFocus: '1x1' | '2x2' | '3x3' | '4x4' = '2x2';
let focusedCameraId: string | null = null;
let currentCameras: any[] = [];
let currentServerUrl: string = 'https://centralitl.unityautomacoes.com.br';

// Clock OSD
function updateClock() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const t = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  if (dvrClock) {
    dvrClock.textContent = `${d} ${t}`;
  }

  // Update timestamps on video overlays
  document.querySelectorAll<HTMLElement>('.live-timestamp-osd').forEach((el) => {
    el.textContent = `${d} ${t}`;
  });
}
setInterval(updateClock, 1000);
updateClock();

// Initialize App
async function init() {
  if (!window.dvrApi) return;

  try {
    const sessionInfo = await window.dvrApi.getSession();
    if (sessionInfo.serverUrl) {
      currentServerUrl = sessionInfo.serverUrl;
      serverUrlInput.value = sessionInfo.serverUrl;
    }

    if (sessionInfo.session && sessionInfo.session.token) {
      // Already authenticated
      loginSection.classList.add('hidden');
      await loadCameras();
    } else {
      // Need login
      loginSection.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Erro ao iniciar sessão:', err);
    loginSection.classList.remove('hidden');
  }
}

// Active stream controllers map
const activeStreamControllers = new Map<string, { stop: () => void; reload: () => void }>();

function stopAllStreams() {
  activeStreamControllers.forEach((ctrl) => {
    try { ctrl.stop(); } catch (e) {}
  });
  activeStreamControllers.clear();
}

// Initialize resilient camera stream with auto-reconnection and staggered startup
function initCameraStream(cam: any, cell: HTMLElement, index: number) {
  const img = cell.querySelector<HTMLImageElement>('.cam-video');
  const badge = cell.querySelector<HTMLElement>('.cam-status-badge');
  const badgeText = cell.querySelector<HTMLElement>('.cam-status-text');
  if (!img) return;

  let isActive = true;
  let retryTimer: any = null;
  let stallInterval: any = null;
  let retryDelay = 2000;
  let lastFrameTime = Date.now();

  const cleanServer = currentServerUrl.replace(/\/$/, '');
  const w = currentLayout === '1x1' ? '1280' : (currentLayout === '2x2' ? '960' : '640');
  const fps = currentLayout === '1x1' ? '20' : (currentLayout === '2x2' ? '15' : '10');
  const streamBase = `${cleanServer}/api/cameras/${cam.id}/stream?w=${w}&fps=${fps}`;

  function connect() {
    if (!isActive || !img) return;
    img.src = `${streamBase}&_t=${Date.now()}`;
  }

  img.onload = () => {
    lastFrameTime = Date.now();
    retryDelay = 2000;
    if (badge) badge.classList.add('hidden');
  };

  img.onerror = () => {
    if (!isActive) return;

    if (badge) {
      const sec = Math.round(retryDelay / 1000);
      if (badgeText) badgeText.textContent = `Reconectando em ${sec}s...`;
      badge.classList.remove('hidden');
    }

    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (!isActive) return;
      connect();
      retryDelay = Math.min(Math.round(retryDelay * 1.5), 8000);
    }, retryDelay);
  };

  const staggerDelay = Math.min(index * 150, 2500);
  const startTimer = setTimeout(() => {
    if (isActive) connect();
  }, staggerDelay);

  stallInterval = setInterval(() => {
    if (!isActive) return;
    if (Date.now() - lastFrameTime > 20000 && !retryTimer) {
      if (badge) {
        if (badgeText) badgeText.textContent = 'Sinal estagnado, reconectando...';
        badge.classList.remove('hidden');
      }
      connect();
    }
  }, 10000);

  activeStreamControllers.set(cam.id, {
    stop: () => {
      isActive = false;
      clearTimeout(startTimer);
      if (retryTimer) clearTimeout(retryTimer);
      if (stallInterval) clearInterval(stallInterval);
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      }
    },
    reload: () => {
      lastFrameTime = Date.now();
      connect();
    }
  });
}

let lastLoadedCameraIds: string[] = [];

// Load Cameras from Central ITL Server
async function loadCameras(forceRender?: boolean) {
  if (!window.dvrApi) return;

  camCountLabel.textContent = 'Sincronizando câmeras...';
  try {
    const res = await window.dvrApi.getCameras();
    if (res.error) {
      camCountLabel.textContent = `Erro: ${res.error}`;
      return;
    }

    currentCameras = res.cameras || [];
    const onlineCount = currentCameras.filter((c) => c.status !== 'OFFLINE').length;
    camCountLabel.textContent = `${onlineCount} / ${currentCameras.length} Câmeras Online`;

    const prevIds = lastLoadedCameraIds.join(',');
    const newIds = currentCameras.map((c) => c.id).join(',');
    if (forceRender || prevIds !== newIds || !videoGrid.querySelector('.cam-cell')) {
      lastLoadedCameraIds = currentCameras.map((c) => c.id);
      renderCameraGrid();
    }
  } catch (e: any) {
    camCountLabel.textContent = `Falha na conexão: ${e.message}`;
  }
}

// Render Camera Grid
function renderCameraGrid() {
  stopAllStreams();
  videoGrid.className = `camera-grid grid-${currentLayout}`;

  if (!currentCameras || currentCameras.length === 0) {
    videoGrid.innerHTML = `
      <div class="empty-cameras">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5">
          <path d="M15 10l5-5v14l-5-5" />
          <rect x="2" y="6" width="13" height="12" rx="2" />
        </svg>
        <p style="font-size: 15px; font-weight: 600;">Nenhuma câmera vinculada à sua conta na Central ITL</p>
        <p style="font-size: 13px; color: #64748b;">Cadastre novas câmeras RTSP ou RTMP no painel da Central.</p>
      </div>
    `;
    return;
  }

  // Calculate capacity based on layout
  let capacity = 4;
  if (currentLayout === '1x1') capacity = 1;
  else if (currentLayout === '2x2') capacity = 4;
  else if (currentLayout === '3x3') capacity = 9;
  else if (currentLayout === '4x4') capacity = 16;

  let camerasToDisplay = currentCameras;
  if (focusedCameraId && currentLayout === '1x1') {
    const found = currentCameras.find((c) => c.id === focusedCameraId);
    camerasToDisplay = found ? [found] : currentCameras.slice(0, 1);
  } else {
    camerasToDisplay = currentCameras.slice(0, capacity);
  }

  videoGrid.innerHTML = camerasToDisplay
    .map((cam, idx) => {
      const isFocused = cam.id === focusedCameraId;
      const camNumber = String(idx + 1).padStart(2, '0');
      const camName = cam.name || `CÂMERA ${camNumber}`;
      const protocol = (cam.protocol || 'RTSP').toUpperCase();
      const resolution = cam.resolution || '1080p';
      const fps = cam.fps || 30;

      return `
        <div class="cam-cell ${isFocused ? 'active-focus' : ''}" data-camera-id="${cam.id}" title="Duplo clique para tela cheia desta câmera">
          <img class="cam-video" data-camera-id="${cam.id}" alt="${escapeHtml(camName)}" />
          <div class="cam-status-badge hidden" data-camera-id="${cam.id}">
            <span class="cam-status-dot"></span>
            <span class="cam-status-text">Conectando...</span>
          </div>

          <div class="osd-top">
            <div class="osd-cam-title">[CAM ${camNumber}] ${escapeHtml(camName)} &bull; ${protocol}</div>
            <div class="osd-cloud-rec">
              <span class="rec-dot"></span>
              NUVEM
            </div>
          </div>

          <div class="osd-bottom">
            <div class="osd-timestamp live-timestamp-osd">--/--/---- --:--:--</div>
            <div class="osd-fps">${resolution} &bull; ${fps} FPS</div>
          </div>

          <div class="cam-action-bar">
            <button class="btn-cam-action btn-cam-focus" data-id="${cam.id}" title="Alternar foco 1x1">
              ${currentLayout === '1x1' ? 'Grade' : 'Focar'}
            </button>
            <button class="btn-cam-action btn-cam-snapshot" data-id="${cam.id}" data-name="${escapeHtml(camName)}" title="Tirar foto instantânea">
              Capturar Foto
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  // Initialize streams with staggered delay
  const cells = videoGrid.querySelectorAll<HTMLElement>('.cam-cell');
  cells.forEach((cell, idx) => {
    const camId = cell.dataset.cameraId;
    const cam = camerasToDisplay.find((c) => c.id === camId);
    if (cam) {
      initCameraStream(cam, cell, idx);
    }
  });

  // Attach cell interaction events
  document.querySelectorAll<HTMLElement>('.cam-cell').forEach((cell) => {
    cell.addEventListener('dblclick', () => {
      const camId = cell.dataset.cameraId;
      if (camId) {
        toggleFocusCamera(camId);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.btn-cam-focus').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (id) toggleFocusCamera(id);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.btn-cam-snapshot').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const name = btn.dataset.name || 'camera';
      const cell = btn.closest('.cam-cell');
      const img = cell?.querySelector<HTMLImageElement>('.cam-video');
      if (img && window.dvrApi) {
        try {
          // Draw image to canvas to get base64
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 1280;
          canvas.height = img.naturalHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const res = await window.dvrApi.saveSnapshot({ dataUrl, cameraName: name });
            if (res.success) {
              const prev = btn.textContent;
              btn.textContent = '✔ Salva!';
              setTimeout(() => { btn.textContent = prev; }, 2000);
            }
          }
        } catch (err) {
          console.error('Falha ao tirar snapshot:', err);
        }
      }
    });
  });
}

function toggleFocusCamera(camId: string) {
  if (currentLayout === '1x1' && focusedCameraId === camId) {
    // Restore previous grid
    currentLayout = previousLayoutBeforeFocus;
    focusedCameraId = null;
  } else {
    previousLayoutBeforeFocus = currentLayout === '1x1' ? '2x2' : currentLayout;
    currentLayout = '1x1';
    focusedCameraId = camId;
  }
  updateLayoutButtonsUI();
  renderCameraGrid();
}

function updateLayoutButtonsUI() {
  layoutButtons.forEach((btn) => {
    if (btn.dataset.layout === currentLayout) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Layout Switcher Events
layoutButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.layout as '1x1' | '2x2' | '3x3' | '4x4';
    if (target) {
      currentLayout = target;
      if (currentLayout !== '1x1') {
        focusedCameraId = null;
      }
      updateLayoutButtonsUI();
      renderCameraGrid();
    }
  });
});

// Fullscreen Toggle
btnFullscreen.addEventListener('click', async () => {
  if (window.dvrApi) {
    await window.dvrApi.toggleFullscreen();
  }
});

// Refresh Cameras
btnRefresh.addEventListener('click', () => {
  loadCameras();
});

// Logout
btnLogout.addEventListener('click', async () => {
  if (confirm('Tem certeza de que deseja desconectar da Central ITL?')) {
    if (window.dvrApi) {
      await window.dvrApi.logout();
    }
    loginSection.classList.remove('hidden');
    videoGrid.innerHTML = '';
  }
});

// Form Submit: Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  btnLoginSubmit.disabled = true;
  btnLoginSubmit.textContent = 'Autenticando na Central ITL...';

  const serverUrl = serverUrlInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    const res = await window.dvrApi.login({ serverUrl, email, password });
    if (!res.success) {
      loginError.textContent = res.error || 'Falha na autenticação. Verifique suas credenciais.';
      loginError.classList.remove('hidden');
    } else {
      currentServerUrl = serverUrl;
      passwordInput.value = '';
      loginSection.classList.add('hidden');
      await loadCameras();
    }
  } catch (err: any) {
    loginError.textContent = err.message || 'Erro inesperado ao conectar.';
    loginError.classList.remove('hidden');
  } finally {
    btnLoginSubmit.disabled = false;
    btnLoginSubmit.textContent = 'Entrar no Visualizador DVR';
  }
});

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Auto-refresh cameras every 30s to detect newly added cameras in cloud
setInterval(() => {
  if (loginSection.classList.contains('hidden')) {
    loadCameras();
  }
}, 30000);

init();
