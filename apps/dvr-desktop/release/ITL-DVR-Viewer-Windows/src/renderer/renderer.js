// Central ITL - Visualizador DVR Nativo (Renderer Process)
(function() {
  'use strict';

  console.log('[ITL DVR] Inicializando Renderer Process...');

  // Global error trap to prevent silent failures
  window.addEventListener('error', function(e) {
    console.error('[ITL DVR Error]', e.error || e.message);
    const errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = 'Aviso no aplicativo: ' + (e.message || 'Falha de execução');
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

  // Diagnostic Modal State
  let currentDiagnosticCam = null;
  const diagModal = document.getElementById('diagModal');
  const btnDiagClose = document.getElementById('btnDiagClose');
  const btnDiagDismiss = document.getElementById('btnDiagDismiss');
  const btnDiagRetry = document.getElementById('btnDiagRetry');

  if (btnDiagClose) btnDiagClose.addEventListener('click', function() { if (diagModal) diagModal.classList.add('hidden'); });
  if (btnDiagDismiss) btnDiagDismiss.addEventListener('click', function() { if (diagModal) diagModal.classList.add('hidden'); });
  if (btnDiagRetry) {
    btnDiagRetry.addEventListener('click', function() {
      if (currentDiagnosticCam) runCameraDiagnostic(currentDiagnosticCam);
    });
  }

  // Diagnostic Test execution
  async function runCameraDiagnostic(cam) {
    currentDiagnosticCam = cam;
    const title = document.getElementById('diagModalTitle');
    const loading = document.getElementById('diagLoading');
    const statusCard = document.getElementById('diagStatusCard');
    const statusTitle = document.getElementById('diagStatusTitle');
    const statusMsg = document.getElementById('diagStatusMsg');
    const logs = document.getElementById('diagLogs');

    if (!diagModal) return;
    diagModal.classList.remove('hidden');

    if (title) title.textContent = 'Diagnóstico: ' + (cam.name || cam.id);
    if (loading) loading.style.display = 'block';
    if (statusCard) statusCard.style.display = 'none';
    if (logs) logs.textContent = 'Testando conectividade RTSP / RTMP para [' + (cam.name || cam.id) + ']...\n';

    try {
      const cleanServer = currentServerUrl.replace(/\/$/, '');
      const resp = await fetch(cleanServer + '/api/cameras/' + cam.id + '/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': currentAuthToken ? ('Bearer ' + currentAuthToken) : '',
          'x-user-id': currentUserId || ''
        }
      });

      const res = await resp.json();
      if (loading) loading.style.display = 'none';

      if (res && res.success) {
        if (statusCard) {
          statusCard.className = 'diag-status-card success';
          statusCard.style.display = 'flex';
        }
        if (statusTitle) statusTitle.textContent = 'SINAL DETECTADO COM SUCESSO';
        if (statusMsg) statusMsg.textContent = res.message || 'Câmera respondendo e gerando dados de transmissão.';
      } else {
        if (statusCard) {
          statusCard.className = 'diag-status-card error';
          statusCard.style.display = 'flex';
        }
        if (statusTitle) statusTitle.textContent = 'SINAL NÃO DETECTADO';
        if (statusMsg) statusMsg.textContent = (res && res.message) || 'Nenhum pacote de vídeo recebido no servidor no momento.';
      }

      if (logs) {
        let logText = (res && res.logs && res.logs.join('\n')) || '';
        if (res && res.details) logText += '\nDetalhes: ' + res.details;
        logs.textContent = logText || 'Nenhum detalhe adicional reportado pelo servidor.';
      }
    } catch (err) {
      if (loading) loading.style.display = 'none';
      if (statusCard) {
        statusCard.className = 'diag-status-card error';
        statusCard.style.display = 'flex';
      }
      if (statusTitle) statusTitle.textContent = 'ERRO DE REQUISIÇÃO';
      if (statusMsg) statusMsg.textContent = 'Falha ao contatar a Central ITL: ' + (err.message || 'Verifique sua conexão');
      if (logs) logs.textContent = String(err.stack || err);
    }
  }

  // Get HLS URLs for camera
  function getCameraHlsUrls(cam, isFocus) {
    const cleanServer = currentServerUrl.replace(/\/$/, '');
    const rawKey = cam.streamKey || cam.id || 'stream';
    const cleanKey = String(rawKey).replace(/^cam[-_]/i, '');
    const mainUrl = cleanServer + '/live/cam_' + cleanKey + '.m3u8';
    const subUrl = cleanServer + '/live/cam_' + cleanKey + '_sub.m3u8';

    return {
      primary: isFocus ? mainUrl : subUrl,
      fallback: mainUrl
    };
  }

  // Initialize HLS camera stream matching Web App Image 2 exactly
  function initCameraStream(cam, cell, index) {
    const video = cell.querySelector('.cam-video');
    const loadingOverlay = cell.querySelector('.cam-loading-overlay');
    const offlineOverlay = cell.querySelector('.cam-offline-overlay');
    const btnRetry = cell.querySelector('.btn-retry-stream');
    const btnDiag = cell.querySelector('.btn-diag-stream');
    const btnFullCell = cell.querySelector('.btn-fullscreen-trigger');

    if (!video) return;

    let hlsInstance = null;
    let isActive = true;
    let isFallback = false;
    let currentAttempt = 0;
    const isFocus = (currentLayout === '1x1');
    const urls = getCameraHlsUrls(cam, isFocus);

    function showLoading() {
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');
      if (offlineOverlay) offlineOverlay.classList.add('hidden');
    }

    function showOnline() {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      if (offlineOverlay) offlineOverlay.classList.add('hidden');
    }

    function showOffline() {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      if (offlineOverlay) offlineOverlay.classList.remove('hidden');
    }

    function cleanupHls() {
      if (hlsInstance) {
        try {
          hlsInstance.destroy();
        } catch (e) {}
        hlsInstance = null;
      }
    }

    function startHls(streamUrl) {
      if (!isActive) return;
      showLoading();
      cleanupHls();

      const HlsClass = window.Hls;
      if (HlsClass && HlsClass.isSupported()) {
        hlsInstance = new HlsClass({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 4,
          maxBufferLength: 6,
          maxMaxBufferLength: 10,
          liveSyncDurationCount: 1,
          liveMaxLatencyDurationCount: 3,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 6,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 6,
          fragLoadingTimeOut: 12000,
          fragLoadingMaxRetry: 6,
        });

        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(video);

        hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, function() {
          showOnline();
          video.play().catch(function() {});
        });

        hlsInstance.on(HlsClass.Events.FRAG_LOADED, function() {
          showOnline();
        });

        hlsInstance.on(HlsClass.Events.ERROR, function(event, data) {
          if (!isActive) return;
          if (data && data.fatal) {
            console.warn('[DVR HLS Fatal]', cam.name, data.type, data.details);

            // If sub-stream failed, try main stream
            if (!isFallback && streamUrl.includes('_sub.m3u8')) {
              isFallback = true;
              console.log('[DVR HLS] Tentando fluxo principal para:', cam.name);
              startHls(urls.fallback);
              return;
            }

            // Retry on network error up to 2 times
            if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR && currentAttempt < 2) {
              currentAttempt++;
              setTimeout(function() {
                if (isActive && hlsInstance) {
                  try { hlsInstance.startLoad(); } catch (e) { showOffline(); }
                }
              }, 2000);
              return;
            }

            // Unrecoverable: camera is offline (no RTMP/RTSP signal)
            showOffline();
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.onloadedmetadata = function() {
          showOnline();
          video.play().catch(function() {});
        };
        video.onerror = function() {
          if (!isFallback && streamUrl.includes('_sub.m3u8')) {
            isFallback = true;
            video.src = urls.fallback;
            return;
          }
          showOffline();
        };
      } else {
        showOffline();
      }
    }

    // Connect video events
    video.onplaying = function() { showOnline(); };
    video.oncanplay = function() { showOnline(); };

    // Stagger startup slightly so 16 cameras don't spike simultaneously
    const startDelay = Math.min(index * 120, 2000);
    const timer = setTimeout(function() {
      if (isActive) {
        startHls(urls.primary);
      }
    }, startDelay);

    // Event listeners
    if (btnRetry) {
      btnRetry.addEventListener('click', function(e) {
        e.stopPropagation();
        isFallback = false;
        currentAttempt = 0;
        startHls(urls.primary);
      });
    }

    if (btnDiag) {
      btnDiag.addEventListener('click', function(e) {
        e.stopPropagation();
        runCameraDiagnostic(cam);
      });
    }

    if (btnFullCell) {
      btnFullCell.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleFocusCamera(cam.id);
      });
    }

    activeStreamControllers.set(cam.id, {
      stop: function() {
        isActive = false;
        clearTimeout(timer);
        cleanupHls();
        if (video) {
          try {
            video.pause();
            video.removeAttribute('src');
            video.load();
          } catch (e) {}
        }
      },
      reload: function() {
        isFallback = false;
        currentAttempt = 0;
        startHls(urls.primary);
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
        const protocol = (cam.protocol || 'RTMP').toUpperCase();
        const location = cam.location || ((cam.city || 'Itamaraju') + ' - ' + (cam.stateUf || 'BA'));

        return (
          '<div class="cam-cell ' + (isFocused ? 'active-focus' : '') + '" data-camera-id="' + cam.id + '" title="Duplo clique para focar">' +
            '<div class="cam-video-container">' +
              '<video class="cam-video" autoplay playsinline muted></video>' +
            '</div>' +

            '<!-- Channel Badge Top-Left -->' +
            '<div class="cam-tag-channel">' +
              '<span class="ping-dot"></span>' +
              '<span>[CH ' + camNumber + ']</span>' +
              '<span class="cam-tag-protocol ' + (protocol === 'RTSP' ? 'rtsp' : '') + '">' + protocol + ' &bull; HLS</span>' +
            '</div>' +

            '<!-- OSD Top-Right Recording Indicator -->' +
            '<div class="osd-top">' +
              '<div class="osd-cloud-rec"><span class="rec-dot"></span>NUVEM</div>' +
            '</div>' +

            '<!-- Loading Overlay State -->' +
            '<div class="cam-loading-overlay">' +
              '<div class="loading-spinner-ring"></div>' +
              '<div class="loading-title">Carregando Câmera...</div>' +
              '<div class="loading-subtitle">Conectando ao fluxo ' + protocol + '...</div>' +
            '</div>' +

            '<!-- OFFLINE STATE (Matching Image 2 exactly) -->' +
            '<div class="cam-offline-overlay hidden">' +
              '<div class="offline-icon-box">' +
                '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<line x1="1" y1="1" x2="23" y2="23"/>' +
                  '<path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>' +
                  '<path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>' +
                  '<path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>' +
                  '<path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>' +
                  '<path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>' +
                  '<line x1="12" y1="20" x2="12.01" y2="20"/>' +
                '</svg>' +
              '</div>' +
              '<div class="offline-title">Transmissão da Câmera Indisponível</div>' +
              '<div class="offline-subtitle">Sinal ' + protocol + ' sem pacotes no momento.</div>' +
              '<div class="offline-actions">' +
                '<button class="btn-offline-action btn-offline-reconnect btn-retry-stream" data-id="' + cam.id + '">' +
                  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>' +
                  '<span>Reconectar</span>' +
                '</button>' +
                '<button class="btn-offline-action btn-offline-diag btn-diag-stream" data-id="' + cam.id + '">' +
                  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' +
                  '<span>Diagnóstico</span>' +
                '</button>' +
              '</div>' +
              '<button class="btn-offline-fullscreen btn-fullscreen-trigger" data-id="' + cam.id + '">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' +
                '<span>Tela Cheia</span>' +
              '</button>' +
            '</div>' +

            '<!-- Bottom Label Bar (Matching Image 2) -->' +
            '<div class="cam-bottom-bar">' +
              '<div class="cam-bottom-name" title="' + escapeHtml(camName) + '">' + escapeHtml(camName) + '</div>' +
              '<div class="cam-bottom-location" title="' + escapeHtml(location) + '">' + escapeHtml(location) + '</div>' +
            '</div>' +

            '<!-- Hover Actions for Online State -->' +
            '<div class="cam-hover-actions">' +
              '<button class="btn-cam-overlay btn-cam-focus" data-id="' + cam.id + '" title="Focar câmera">' +
                (currentLayout === '1x1' ? 'Grade' : 'Focar') +
              '</button>' +
              '<button class="btn-cam-overlay btn-cam-snapshot" data-id="' + cam.id + '" data-name="' + escapeHtml(camName) + '" title="Capturar Foto">' +
                'Foto' +
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
        const media = cell ? cell.querySelector('.cam-video') : null;
        if (media) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = media.videoWidth || media.naturalWidth || 1280;
            canvas.height = media.videoHeight || media.naturalHeight || 720;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
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

      // Check localStorage fallback safely
      const savedToken = safeGetStorage('itl_dvr_token');
      const savedUser = safeGetStorage('itl_dvr_user');
      const savedUrl = safeGetStorage('itl_dvr_url');
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

  // Safe local storage helpers (prevents crashes in sandboxed or file:// origins)
  function safeSetStorage(key, val) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, val);
      }
    } catch (e) {
      console.warn('[ITL DVR Storage] Falha ao salvar no storage local:', e);
    }
  }

  function safeGetStorage(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  // Primary Login Handler
  let isAuthenticating = false;

  async function performLogin(event) {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    if (isAuthenticating) {
      console.log('[ITL DVR] Autenticação já em andamento...');
      return false;
    }

    if (loginError) {
      loginError.classList.add('hidden');
      loginError.textContent = '';
    }

    if (btnLoginSubmit) {
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.textContent = 'Autenticando na Central ITL...';
    }

    const serverUrl = (serverUrlInput ? serverUrlInput.value : '').trim();
    const email = (emailInput ? emailInput.value : '').trim();
    const password = passwordInput ? passwordInput.value : '';

    console.log('[ITL DVR] Tentativa de login:', { serverUrl, email, hasPassword: !!password });

    if (!serverUrl || !email || !password) {
      if (loginError) {
        loginError.textContent = 'Por favor, preencha o endereço da Central, seu e-mail/usuário e a senha.';
        loginError.classList.remove('hidden');
      }
      if (btnLoginSubmit) {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.textContent = 'Entrar no Visualizador DVR';
      }
      return false;
    }

    isAuthenticating = true;

    try {
      let res = null;

      // Method 1: Electron IPC Native Login
      if (window.dvrApi && typeof window.dvrApi.login === 'function') {
        console.log('[ITL DVR] Enviando credenciais via IPC Nativo...');
        res = await window.dvrApi.login({ serverUrl: serverUrl, email: email, password: password });
        console.log('[ITL DVR] Retorno do IPC:', res);
      }

      // Method 2: Direct Fetch Fallback (if IPC not available or in browser mode)
      if (!res) {
        console.log('[ITL DVR] Usando fallback direto HTTP fetch...');
        const cleanUrl = serverUrl.replace(/\/$/, '');
        const loginData = { email: email, username: email, password: password };

        const fetchDirect = async (url) => {
          const ctrl = new AbortController();
          const tId = setTimeout(() => ctrl.abort(), 9000);
          try {
            const resp = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(loginData),
              signal: ctrl.signal,
            });
            clearTimeout(tId);
            return resp;
          } catch (err) {
            clearTimeout(tId);
            throw err;
          }
        };

        let response = null;
        try {
          response = await fetchDirect(cleanUrl + '/api/v1/auth/login');
        } catch (e1) {
          try {
            response = await fetchDirect(cleanUrl + '/api/auth/login');
          } catch (e2) {
            res = { success: false, error: 'Não foi possível alcançar o servidor (' + e2.message + '). Verifique o link e sua internet.' };
          }
        }

        if (response) {
          if (!response.ok && response.status === 404) {
            try { response = await fetchDirect(cleanUrl + '/api/auth/login'); } catch (e) {}
          }

          if (response) {
            const data = await response.json().catch(() => ({ success: false, error: 'Resposta inválida do servidor' }));
            if (!response.ok || !data.success) {
              res = { success: false, error: data.error || ('Erro HTTP ' + response.status + ': Credenciais inválidas') };
            } else {
              res = { success: true, user: data.user, token: data.token };
            }
          }
        }
      }

      if (!res || !res.success) {
        const errMsg = (res && res.error) || 'Falha na autenticação. Verifique o servidor, usuário ou senha.';
        console.warn('[ITL DVR] Erro no login:', errMsg);
        if (loginError) {
          loginError.textContent = errMsg;
          loginError.classList.remove('hidden');
        }
      } else {
        console.log('[ITL DVR] Login efetuado com sucesso! Carregando mural DVR...');
        currentServerUrl = serverUrl;
        currentAuthToken = res.token || '';
        currentUserId = (res.user && res.user.id) || '';

        safeSetStorage('itl_dvr_token', currentAuthToken);
        safeSetStorage('itl_dvr_user', currentUserId);
        safeSetStorage('itl_dvr_url', currentServerUrl);

        if (passwordInput) passwordInput.value = '';
        if (loginSection) loginSection.classList.add('hidden');
        await loadCameras(true);
      }
    } catch (err) {
      console.error('[ITL DVR] Exceção durante o login:', err);
      if (loginError) {
        loginError.textContent = 'Não foi possível conectar: ' + (err.message || 'Verifique se o servidor está online.');
        loginError.classList.remove('hidden');
      }
    } finally {
      isAuthenticating = false;
      if (btnLoginSubmit) {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.textContent = 'Entrar no Visualizador DVR';
      }
    }

    return false;
  }

  // Expose login function to global scope
  window.itlPerformLogin = performLogin;
  window.performLogin = performLogin;

  // Bind Form Submit & Button Click
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      performLogin(e);
      return false;
    });
  }

  if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener('click', function(e) {
      performLogin(e);
      return false;
    });
  }

  // Allow pressing Enter in input fields
  [serverUrlInput, emailInput, passwordInput].forEach(function(inp) {
    if (inp) {
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          performLogin(e);
        }
      });
    }
  });

  // Auto-refresh cameras every 30s
  setInterval(function() {
    if (loginSection && loginSection.classList.contains('hidden')) {
      loadCameras();
    }
  }, 30000);

  // Run initial session check
  console.log('[ITL DVR] Iniciando sessão...');
  init();
})();
