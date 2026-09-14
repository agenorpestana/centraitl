// Central ITL - Visualizador DVR Nativo (Renderer Process)
(function() {
  'use strict';

  // Global safety for exports
  if (typeof window !== 'undefined') {
    window.exports = window.exports || {};
  }

  // Global error trap to prevent silent failures
  window.addEventListener('error', function(e) {
    console.error('[ITL DVR Error]', e.error || e.message);
    const errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = 'Erro no aplicativo: ' + (e.message || 'Falha de execução');
      errEl.classList.remove('hidden');
    }
  });

  // DOM Elements
  const loginSection = document.getElementById('loginSection');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');
  const serverUrlInput = document.getElementById('serverUrl');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  const dvrClock = document.getElementById('dvrClock');
  const camCountLabel = document.getElementById('camCountLabel');
  const videoGrid = document.getElementById('videoGrid');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnLogout = document.getElementById('btnLogout');
  const layoutButtons = document.querySelectorAll('.layout-btn');

  // State
  let currentLayout = '2x2';
  let previousLayoutBeforeFocus = '2x2';
  let focusedCameraId = null;
  let currentCameras = [];
  let currentServerUrl = 'https://centralitl.unityautomacoes.com.br';
  let currentAuthToken = '';
  let currentUserId = '';

  // Clock OSD
  function updateClock() {
    try {
      const now = new Date();
      const pad = function(n) { return n.toString().padStart(2, '0'); };
      const d = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear();
      const t = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      if (dvrClock) {
        dvrClock.textContent = d + ' ' + t;
      }
      document.querySelectorAll('.live-timestamp-osd').forEach(function(el) {
        el.textContent = d + ' ' + t;
      });
    } catch (e) {}
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Active stream controllers map (camId -> { stop, reload, isActive })
  const activeStreamControllers = new Map();

  function stopAllStreams() {
    activeStreamControllers.forEach(function(ctrl) {
      if (ctrl && typeof ctrl.stop === 'function') {
        try { ctrl.stop(); } catch (e) {}
      }
    });
    activeStreamControllers.clear();
  }

  // Escape HTML helper
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Update layout buttons UI
  function updateLayoutButtonsUI() {
    layoutButtons.forEach(function(btn) {
      if (btn.dataset.layout === currentLayout) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Initialize resilient camera stream with auto-reconnection and staggered startup
  function initCameraStream(cam, cell, index) {
    const img = cell.querySelector('.cam-video');
    const badge = cell.querySelector('.cam-status-badge');
    const badgeText = cell.querySelector('.cam-status-text');
    if (!img) return;

    let isActive = true;
    let retryTimer = null;
    let stallInterval = null;
    let retryDelay = 2000;
    let consecutiveFails = 0;
    let lastFrameTime = Date.now();

    const cleanServer = currentServerUrl.replace(/\/$/, '');
    const w = currentLayout === '1x1' ? '1280' : (currentLayout === '2x2' ? '960' : '640');
    const fps = currentLayout === '1x1' ? '20' : (currentLayout === '2x2' ? '15' : '10');
    const streamBase = cleanServer + '/api/cameras/' + cam.id + '/stream?w=' + w + '&fps=' + fps;

    function connect() {
      if (!isActive) return;
      img.src = streamBase + '&_t=' + Date.now();
    }

    img.onload = function() {
      lastFrameTime = Date.now();
      consecutiveFails = 0;
      retryDelay = 2000;
      if (badge) badge.classList.add('hidden');
    };

    img.onerror = function() {
      if (!isActive) return;
      consecutiveFails++;

      // Keep current image rendered (do NOT blank to black), show reconnect badge
      if (badge) {
        const sec = Math.round(retryDelay / 1000);
        if (badgeText) badgeText.textContent = 'Reconectando em ' + sec + 's...';
        badge.classList.remove('hidden');
      }

      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(function() {
        if (!isActive) return;
        connect();
        // Exponential backoff up to 8s
        retryDelay = Math.min(Math.round(retryDelay * 1.5), 8000);
      }, retryDelay);
    };

    // Stagger stream connections (150ms per camera) to avoid simultaneous CPU/socket spike on server
    const staggerDelay = Math.min(index * 150, 2500);
    const startTimer = setTimeout(function() {
      if (isActive) connect();
    }, staggerDelay);

    // Watchdog: detect silent stream stalls
    stallInterval = setInterval(function() {
      if (!isActive) return;
      // If no new frames for 20s and not currently in retry, reconnect
      if (Date.now() - lastFrameTime > 20000 && !retryTimer) {
        if (badge) {
          if (badgeText) badgeText.textContent = 'Sinal estagnado, reconectando...';
          badge.classList.remove('hidden');
        }
        connect();
      }
    }, 10000);

    activeStreamControllers.set(cam.id, {
      stop: function() {
        isActive = false;
        clearTimeout(startTimer);
        if (retryTimer) clearTimeout(retryTimer);
        if (stallInterval) clearInterval(stallInterval);
        img.onload = null;
        img.onerror = null;
        img.src = '';
      },
      reload: function() {
        lastFrameTime = Date.now();
        connect();
      }
    });
  }

  // Render Camera Grid
  function renderCameraGrid() {
    if (!videoGrid) return;

    // Clean up existing streams before rebuilding grid
    stopAllStreams();

    videoGrid.className = 'camera-grid grid-' + currentLayout;

    if (!currentCameras || currentCameras.length === 0) {
      videoGrid.innerHTML =
        '<div class="empty-cameras">' +
          '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5">' +
            '<path d="M15 10l5-5v14l-5-5" />' +
            '<rect x="2" y="6" width="13" height="12" rx="2" />' +
          '</svg>' +
          '<p style="font-size: 15px; font-weight: 600;">Nenhuma câmera vinculada à sua conta na Central ITL</p>' +
          '<p style="font-size: 13px; color: #64748b;">Cadastre novas câmeras RTSP ou RTMP no painel da Central.</p>' +
        '</div>';
      return;
    }

    let capacity = 4;
    if (currentLayout === '1x1') capacity = 1;
    else if (currentLayout === '2x2') capacity = 4;
    else if (currentLayout === '3x3') capacity = 9;
    else if (currentLayout === '4x4') capacity = 16;

    let camerasToDisplay = currentCameras;
    if (focusedCameraId && currentLayout === '1x1') {
      const found = currentCameras.find(function(c) { return c.id === focusedCameraId; });
      camerasToDisplay = found ? [found] : currentCameras.slice(0, 1);
    } else {
      camerasToDisplay = currentCameras.slice(0, capacity);
    }

    videoGrid.innerHTML = camerasToDisplay
      .map(function(cam, idx) {
        const isFocused = cam.id === focusedCameraId;
        const camNumber = String(idx + 1).padStart(2, '0');
        const camName = cam.name || ('CÂMERA ' + camNumber);
        const protocol = (cam.protocol || 'RTSP').toUpperCase();
        const resolution = cam.resolution || '1080p';
        const fps = cam.fps || 30;

        return (
          '<div class="cam-cell ' + (isFocused ? 'active-focus' : '') + '" data-camera-id="' + cam.id + '" title="Duplo clique para tela cheia desta câmera">' +
            '<img class="cam-video" data-camera-id="' + cam.id + '" alt="' + escapeHtml(camName) + '" />' +
            '<div class="cam-status-badge hidden" data-camera-id="' + cam.id + '">' +
              '<span class="cam-status-dot"></span>' +
              '<span class="cam-status-text">Conectando...</span>' +
            '</div>' +
            '<div class="osd-top">' +
              '<div class="osd-cam-title">[CAM ' + camNumber + '] ' + escapeHtml(camName) + ' &bull; ' + protocol + '</div>' +
              '<div class="osd-cloud-rec"><span class="rec-dot"></span>NUVEM</div>' +
            '</div>' +
            '<div class="osd-bottom">' +
              '<div class="osd-timestamp live-timestamp-osd">--/--/---- --:--:--</div>' +
              '<div class="osd-fps">' + resolution + ' &bull; ' + fps + ' FPS</div>' +
            '</div>' +
            '<div class="cam-action-bar">' +
              '<button class="btn-cam-action btn-cam-focus" data-id="' + cam.id + '" title="Alternar foco 1x1">' +
                (currentLayout === '1x1' ? 'Grade' : 'Focar') +
              '</button>' +
              '<button class="btn-cam-action btn-cam-snapshot" data-id="' + cam.id + '" data-name="' + escapeHtml(camName) + '" title="Capturar foto instantânea">' +
                'Capturar Foto' +
              '</button>' +
            '</div>' +
          '</div>'
        );
      })
      .join('');

    // Attach stream controllers and listeners to each camera cell
    const cells = videoGrid.querySelectorAll('.cam-cell');
    cells.forEach(function(cell, idx) {
      const camId = cell.dataset.cameraId;
      const cam = camerasToDisplay.find(function(c) { return c.id === camId; });
      if (cam) {
        initCameraStream(cam, cell, idx);
      }
    });

    // Attach cell interaction events
    cells.forEach(function(cell) {
      cell.addEventListener('dblclick', function() {
        const camId = cell.dataset.cameraId;
        if (camId) toggleFocusCamera(camId);
      });
    });

    document.querySelectorAll('.btn-cam-focus').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (id) toggleFocusCamera(id);
      });
    });

    document.querySelectorAll('.btn-cam-snapshot').forEach(function(btn) {
      btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        const name = btn.dataset.name || 'camera';
        const cell = btn.closest('.cam-cell');
        const img = cell ? cell.querySelector('.cam-video') : null;
        if (img) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 1280;
            canvas.height = img.naturalHeight || 720;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
              if (window.dvrApi && window.dvrApi.saveSnapshot) {
                const res = await window.dvrApi.saveSnapshot({ dataUrl: dataUrl, cameraName: name });
                if (res && res.success) {
                  const prev = btn.textContent;
                  btn.textContent = '✔ Salva!';
                  setTimeout(function() { btn.textContent = prev; }, 2000);
                }
              } else {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = name + '-' + Date.now() + '.jpg';
                a.click();
              }
            }
          } catch (err) {
            console.error('Falha ao tirar snapshot:', err);
          }
        }
      });
    });

    updateClock();
  }

  function toggleFocusCamera(camId) {
    if (focusedCameraId === camId && currentLayout === '1x1') {
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

  let lastLoadedCameraIds = [];

  // Load Cameras from Central ITL Server
  async function loadCameras(forceRender) {
    if (camCountLabel) camCountLabel.textContent = 'Sincronizando câmeras...';

    try {
      let cameras = [];
      if (window.dvrApi && window.dvrApi.getCameras) {
        const res = await window.dvrApi.getCameras();
        if (res && res.error) {
          if (camCountLabel) camCountLabel.textContent = 'Erro: ' + res.error;
          return;
        }
        cameras = (res && res.cameras) || [];
      } else {
        // Direct fetch fallback
        const cleanServer = currentServerUrl.replace(/\/$/, '');
        const resp = await fetch(cleanServer + '/api/v1/cameras', {
          headers: {
            'Authorization': currentAuthToken ? ('Bearer ' + currentAuthToken) : '',
            'x-user-id': currentUserId || ''
          }
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        cameras = await resp.json();
      }

      currentCameras = Array.isArray(cameras) ? cameras : [];
      const onlineCount = currentCameras.filter(function(c) { return c.status !== 'OFFLINE'; }).length;
      if (camCountLabel) {
        camCountLabel.textContent = onlineCount + ' / ' + currentCameras.length + ' Câmeras Online';
      }

      const prevIds = (lastLoadedCameraIds || []).join(',');
      const newIds = currentCameras.map(function(c) { return c.id; }).join(',');
      if (forceRender || prevIds !== newIds || !videoGrid.querySelector('.cam-cell')) {
        lastLoadedCameraIds = currentCameras.map(function(c) { return c.id; });
        renderCameraGrid();
      }
    } catch (e) {
      console.error('Erro ao carregar câmeras:', e);
      if (camCountLabel) {
        camCountLabel.textContent = 'Falha na conexão: ' + (e.message || 'Sem sinal');
      }
    }
  }

  // Initialize App
  async function init() {
    try {
      if (window.dvrApi && window.dvrApi.getSession) {
        const sessionInfo = await window.dvrApi.getSession();
        if (sessionInfo && sessionInfo.serverUrl) {
          currentServerUrl = sessionInfo.serverUrl;
          if (serverUrlInput) serverUrlInput.value = sessionInfo.serverUrl;
        }

        if (sessionInfo && sessionInfo.session && sessionInfo.session.token) {
          currentAuthToken = sessionInfo.session.token;
          currentUserId = sessionInfo.session.user ? sessionInfo.session.user.id : '';
          if (loginSection) loginSection.classList.add('hidden');
          await loadCameras();
          return;
        }
      }

      // Check localStorage fallback
      const savedToken = localStorage.getItem('itl_dvr_token');
      const savedUser = localStorage.getItem('itl_dvr_user');
      const savedUrl = localStorage.getItem('itl_dvr_url');
      if (savedUrl && serverUrlInput) {
        currentServerUrl = savedUrl;
        serverUrlInput.value = savedUrl;
      }

      if (savedToken && savedUser) {
        currentAuthToken = savedToken;
        currentUserId = savedUser;
        if (loginSection) loginSection.classList.add('hidden');
        await loadCameras();
        return;
      }

      if (loginSection) loginSection.classList.remove('hidden');
    } catch (err) {
      console.error('Erro ao iniciar sessão:', err);
      if (loginSection) loginSection.classList.remove('hidden');
    }
  }

  // Layout Switcher Events
  layoutButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const target = btn.dataset.layout;
      if (target) {
        currentLayout = target;
        if (currentLayout !== '1x1') focusedCameraId = null;
        updateLayoutButtonsUI();
        renderCameraGrid();
      }
    });
  });

  // Fullscreen Toggle
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', async function() {
      if (window.dvrApi && window.dvrApi.toggleFullscreen) {
        await window.dvrApi.toggleFullscreen();
      } else {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(function() {});
        } else {
          document.exitFullscreen().catch(function() {});
        }
      }
    });
  }

  // Refresh Cameras
  if (btnRefresh) {
    btnRefresh.addEventListener('click', function() {
      loadCameras(true);
    });
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', async function() {
      if (confirm('Tem certeza de que deseja desconectar da Central ITL?')) {
        if (window.dvrApi && window.dvrApi.logout) {
          await window.dvrApi.logout();
        }
        localStorage.removeItem('itl_dvr_token');
        localStorage.removeItem('itl_dvr_user');
        currentAuthToken = '';
        currentUserId = '';
        currentCameras = [];
        if (loginSection) loginSection.classList.remove('hidden');
        if (videoGrid) videoGrid.innerHTML = '';
        if (passwordInput) passwordInput.value = '';
      }
    });
  }

  // Primary Login Handler
  async function performLogin() {
    if (loginError) loginError.classList.add('hidden');
    if (btnLoginSubmit) {
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.textContent = 'Autenticando na Central ITL...';
    }

    const serverUrl = (serverUrlInput ? serverUrlInput.value : '').trim();
    const email = (emailInput ? emailInput.value : '').trim();
    const password = passwordInput ? passwordInput.value : '';

    if (!serverUrl || !email || !password) {
      if (loginError) {
        loginError.textContent = 'Por favor, preencha URL, e-mail/usuário e senha.';
        loginError.classList.remove('hidden');
      }
      if (btnLoginSubmit) {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.textContent = 'Entrar no Visualizador DVR';
      }
      return;
    }

    try {
      let res = null;

      // Method 1: Electron IPC Native Login
      if (window.dvrApi && typeof window.dvrApi.login === 'function') {
        res = await window.dvrApi.login({ serverUrl: serverUrl, email: email, password: password });
      }

      // Method 2: Direct Fetch Fallback (if IPC not available or in browser mode)
      if (!res) {
        const cleanUrl = serverUrl.replace(/\/$/, '');
        let response = await fetch(cleanUrl + '/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, username: email, password: password })
        }).catch(function() { return null; });

        if (!response || !response.ok) {
          // Try /api/auth/login
          response = await fetch(cleanUrl + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, username: email, password: password })
          });
        }

        const data = await response.json();
        if (!response.ok || !data.success) {
          res = { success: false, error: data.error || ('Erro HTTP ' + response.status + ': Credenciais inválidas') };
        } else {
          res = { success: true, user: data.user, token: data.token };
        }
      }

      if (!res || !res.success) {
        if (loginError) {
          loginError.textContent = (res && res.error) || 'Falha na autenticação. Verifique o servidor, usuário ou senha.';
          loginError.classList.remove('hidden');
        }
      } else {
        currentServerUrl = serverUrl;
        currentAuthToken = res.token || '';
        currentUserId = (res.user && res.user.id) || '';

        localStorage.setItem('itl_dvr_token', currentAuthToken);
        localStorage.setItem('itl_dvr_user', currentUserId);
        localStorage.setItem('itl_dvr_url', currentServerUrl);

        if (passwordInput) passwordInput.value = '';
        if (loginSection) loginSection.classList.add('hidden');
        await loadCameras();
      }
    } catch (err) {
      console.error('Erro no login:', err);
      if (loginError) {
        loginError.textContent = 'Não foi possível conectar: ' + (err.message || 'Verifique se o servidor está online.');
        loginError.classList.remove('hidden');
      }
    } finally {
      if (btnLoginSubmit) {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.textContent = 'Entrar no Visualizador DVR';
      }
    }
  }

  // Bind Form Submit & Button Click
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      performLogin();
      return false;
    });
  }

  if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener('click', function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      performLogin();
      return false;
    });
  }

  // Auto-refresh cameras every 30s
  setInterval(function() {
    if (loginSection && loginSection.classList.contains('hidden')) {
      loadCameras();
    }
  }, 30000);

  // Run initial session check
  init();
})();
