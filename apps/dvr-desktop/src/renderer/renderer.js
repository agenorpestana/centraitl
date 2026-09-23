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
    
    // Use camera videoStreamUrl if valid, otherwise build standard live m3u8
    let mainUrl = cam.videoStreamUrl || cam.fullRtmpUrl || (cleanServer + '/live/cam_' + cleanKey + '.m3u8');
    if (mainUrl.startsWith('/')) {
      mainUrl = cleanServer + mainUrl;
    }
    if (mainUrl.includes('/live/') && !mainUrl.endsWith('.m3u8')) {
      mainUrl = mainUrl.split('?')[0] + '.m3u8';
    }

    // Only use sub-stream if explicitly configured on the camera object
    let subUrl = cam.subStreamUrl || cam.subHlsUrl || null;
    if (subUrl && subUrl.startsWith('/')) {
      subUrl = cleanServer + subUrl;
    }

    return {
      primary: (!isFocus && subUrl) ? subUrl : mainUrl,
      fallback: mainUrl
    };
  }

  // Helper to determine if camera uses RTSP protocol
  function isCameraRtsp(cam) {
    if (!cam) return false;
    const proto = (cam.protocol || '').toUpperCase();
    if (proto === 'RTSP') return true;
    const rtsp = (cam.rtspUrl || '').toLowerCase();
    if (rtsp.startsWith('rtsp://') || rtsp.includes('rtsp')) return true;
    const vUrl = (cam.videoStreamUrl || '').toLowerCase();
    if (vUrl.startsWith('rtsp://') || vUrl.includes('rtsp')) return true;
    return false;
  }

  // Initialize MJPEG camera stream for RTSP cameras (low CPU, direct frames, fast offline detection)
  function initMjpegStream(cam, cell, index) {
    const img = cell.querySelector('.cam-video');
    const loadingOverlay = cell.querySelector('.cam-loading-overlay');
    const offlineOverlay = cell.querySelector('.cam-offline-overlay');
    const btnRetry = cell.querySelector('.btn-retry-stream');
    const btnDiag = cell.querySelector('.btn-diag-stream');
    const btnFullCell = cell.querySelector('.btn-fullscreen-trigger');

    if (!img) return;

    let isActive = true;
    let isOnline = false;
    let connectTimeout = null;
    let probeTimer = null;
    let startTimer = null;

    const cleanServer = currentServerUrl.replace(/\/$/, '');
    const isFocus = (currentLayout === '1x1');

    function getMjpegUrl() {
      const w = isFocus ? 1280 : 640;
      const fps = isFocus ? 15 : 10;
      const userParam = currentUserId ? ('&userId=' + encodeURIComponent(currentUserId)) : '';
      const tokenParam = currentAuthToken ? ('&token=' + encodeURIComponent(currentAuthToken)) : '';
      return cleanServer + '/api/cameras/' + encodeURIComponent(cam.id) + '/stream?w=' + w + '&fps=' + fps + userParam + tokenParam + '&t=' + Date.now();
    }

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

    function handleOffline() {
      if (!isActive) return;
      isOnline = false;
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      // Detach source immediately to stop consuming network sockets & CPU on offline stream
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.removeAttribute('src');
        img.src = '';
      }
      showOffline();
      schedulePeriodicProbe();
    }

    function schedulePeriodicProbe() {
      if (probeTimer) clearInterval(probeTimer);
      // Check every 45s if offline camera has come back online
      probeTimer = setInterval(function() {
        if (!isActive || isOnline) return;
        probeCameraOnline();
      }, 45000);
    }

    function probeCameraOnline() {
      if (!isActive || isOnline) return;
      console.log('[DVR Probe] Verificando se câmera RTSP retornou online:', cam.name);
      try {
        const testImg = new Image();
        let finished = false;
        const pTimeout = setTimeout(function() {
          if (!finished) {
            finished = true;
            testImg.onload = null;
            testImg.onerror = null;
            testImg.src = '';
          }
        }, 6000);

        testImg.onload = function() {
          if (finished) return;
          finished = true;
          clearTimeout(pTimeout);
          testImg.onload = null;
          testImg.onerror = null;
          testImg.src = '';
          if (isActive && !isOnline) {
            console.log('[DVR Probe] Câmera RTSP voltou a responder! Conectando fluxo:', cam.name);
            if (probeTimer) {
              clearInterval(probeTimer);
              probeTimer = null;
            }
            startStream();
          }
        };

        testImg.onerror = function() {
          if (finished) return;
          finished = true;
          clearTimeout(pTimeout);
          testImg.onload = null;
          testImg.onerror = null;
          testImg.src = '';
        };

        testImg.src = getMjpegUrl();
      } catch (e) {}
    }

    function startStream() {
      if (!isActive) return;
      showLoading();
      isOnline = false;

      if (connectTimeout) clearTimeout(connectTimeout);
      if (probeTimer) {
        clearInterval(probeTimer);
        probeTimer = null;
      }

      // Fast offline detection: If no frame arrives within 9s, declare offline to save CPU
      connectTimeout = setTimeout(function() {
        if (!isActive || isOnline) return;
        console.warn('[DVR MJPEG Timeout] Sem resposta da câmera RTSP (Off-line):', cam.name);
        handleOffline();
      }, 9000);

      img.onload = function() {
        if (!isActive) return;
        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        isOnline = true;
        showOnline();
      };

      img.onerror = function() {
        if (!isActive) return;
        console.warn('[DVR MJPEG Erro] Falha ao carregar fluxo MJPEG:', cam.name);
        handleOffline();
      };

      img.src = getMjpegUrl();
    }

    // Stagger startup slightly so 16 cameras do not spike initial requests at the exact same millisecond
    const startDelay = Math.min(index * 120, 2000);
    startTimer = setTimeout(function() {
      if (isActive) {
        startStream();
      }
    }, startDelay);

    // Event listeners
    if (btnRetry) {
      btnRetry.addEventListener('click', function(e) {
        e.stopPropagation();
        if (probeTimer) {
          clearInterval(probeTimer);
          probeTimer = null;
        }
        startStream();
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
        if (startTimer) clearTimeout(startTimer);
        if (connectTimeout) clearTimeout(connectTimeout);
        if (probeTimer) clearInterval(probeTimer);
        if (img) {
          img.onload = null;
          img.onerror = null;
          img.removeAttribute('src');
          img.src = '';
        }
      },
      reload: function() {
        if (probeTimer) {
          clearInterval(probeTimer);
          probeTimer = null;
        }
        startStream();
      }
    });
  }

  // Initialize HLS camera stream for RTMP cameras (hardware remux -c:v copy, low CPU)
  function initHlsStream(cam, cell, index) {
    const video = cell.querySelector('.cam-video');
    const loadingOverlay = cell.querySelector('.cam-loading-overlay');
    const offlineOverlay = cell.querySelector('.cam-offline-overlay');
    const btnRetry = cell.querySelector('.btn-retry-stream');
    const btnDiag = cell.querySelector('.btn-diag-stream');
    const btnFullCell = cell.querySelector('.btn-fullscreen-trigger');

    if (!video) return;

    let hlsInstance = null;
    let isActive = true;
    let isOnline = false;
    let isFallback = false;
    let currentAttempt = 0;
    let retryTimer = null;
    let connectTimeout = null;
    let probeTimer = null;
    let stallWatchdog = null;
    let lastPlayTime = 0;
    let lastProgressTime = Date.now();

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

    function handleOffline() {
      if (!isActive) return;
      isOnline = false;
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      cleanupHls();
      showOffline();
      schedulePeriodicProbe();
    }

    function schedulePeriodicProbe() {
      if (probeTimer) clearInterval(probeTimer);
      // Check every 45s if offline RTMP stream has packets again
      probeTimer = setInterval(function() {
        if (!isActive || isOnline) return;
        probeHlsOnline();
      }, 45000);
    }

    async function probeHlsOnline() {
      if (!isActive || isOnline) return;
      console.log('[DVR Probe] Verificando se câmera RTMP retornou online:', cam.name);
      try {
        const resp = await fetch(urls.primary, { method: 'HEAD', cache: 'no-cache' });
        if (resp && resp.ok) {
          console.log('[DVR Probe] Câmera RTMP retornou com manifesto HLS! Conectando:', cam.name);
          if (probeTimer) {
            clearInterval(probeTimer);
            probeTimer = null;
          }
          currentAttempt = 0;
          startHls(urls.primary);
        }
      } catch (e) {}
    }

    function startWatchdog() {
      if (stallWatchdog) clearInterval(stallWatchdog);
      lastProgressTime = Date.now();
      stallWatchdog = setInterval(function() {
        if (!isActive || !video) return;
        if (video.paused) {
          video.play().catch(function() {});
          return;
        }
        if (video.currentTime > 0) {
          if (Math.abs(video.currentTime - lastPlayTime) > 0.05) {
            lastPlayTime = video.currentTime;
            lastProgressTime = Date.now();
          } else if (Date.now() - lastProgressTime > 5000) {
            lastProgressTime = Date.now();
            if (video.buffered && video.buffered.length > 0) {
              const end = video.buffered.end(video.buffered.length - 1);
              if (end - video.currentTime > 0.4) {
                video.currentTime = Math.max(0, end - 0.2);
              } else if (hlsInstance) {
                try { hlsInstance.startLoad(); } catch (e) {}
              }
            } else if (hlsInstance) {
              try { hlsInstance.startLoad(); } catch (e) {}
            }
          }
        }
      }, 2000);
    }

    function cleanupHls() {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (stallWatchdog) {
        clearInterval(stallWatchdog);
        stallWatchdog = null;
      }
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      if (hlsInstance) {
        try {
          hlsInstance.destroy();
        } catch (e) {}
        hlsInstance = null;
      }
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {}
      }
    }

    function startHls(streamUrl) {
      if (!isActive) return;
      showLoading();
      cleanupHls();
      isOnline = false;

      // Fast offline detection: If manifest or media doesn't load within 12s, show offline
      connectTimeout = setTimeout(function() {
        if (!isActive || isOnline) return;
        console.warn('[DVR HLS Timeout] Sem fluxo de pacotes RTMP/HLS (Off-line):', cam.name);
        handleOffline();
      }, 12000);

      const HlsClass = window.Hls;
      if (HlsClass && HlsClass.isSupported()) {
        hlsInstance = new HlsClass({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 0,
          maxBufferLength: 8,
          maxMaxBufferLength: 16,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 6,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3,
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 3,
          levelLoadingRetryDelay: 1000,
          fragLoadingTimeOut: 15000,
          fragLoadingMaxRetry: 3,
          fragLoadingRetryDelay: 1000,
          nudgeOffset: 0.2,
          nudgeMaxRetry: 5,
          maxLoadingDelay: 4,
        });

        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(video);

        hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, function() {
          if (!isActive) return;
          if (connectTimeout) {
            clearTimeout(connectTimeout);
            connectTimeout = null;
          }
          isOnline = true;
          showOnline();
          currentAttempt = 0;
          startWatchdog();
          video.play().catch(function() {});
        });

        hlsInstance.on(HlsClass.Events.FRAG_LOADED, function() {
          if (!isActive) return;
          if (connectTimeout) {
            clearTimeout(connectTimeout);
            connectTimeout = null;
          }
          isOnline = true;
          showOnline();
          currentAttempt = 0;
          lastProgressTime = Date.now();
        });

        hlsInstance.on(HlsClass.Events.ERROR, function(event, data) {
          if (!isActive) return;
          console.warn('[DVR HLS Event]', cam.name, data.type, data.details, 'Fatal:', data.fatal);

          if (data && data.fatal) {
            switch (data.type) {
              case HlsClass.ErrorTypes.NETWORK_ERROR:
                if (!isFallback && streamUrl.includes('_sub.m3u8')) {
                  isFallback = true;
                  startHls(urls.fallback);
                  return;
                }
                currentAttempt++;
                if (currentAttempt > 3) {
                  // Keep probing quietly every 5s so wall monitors recover by themselves
                  handleOffline();
                  if (retryTimer) clearTimeout(retryTimer);
                  retryTimer = setTimeout(function() {
                    if (isActive) {
                      startHls(streamUrl);
                    }
                  }, 5000);
                  return;
                }
                const netDelay = Math.min(currentAttempt * 2000, 5000);
                if (retryTimer) clearTimeout(retryTimer);
                retryTimer = setTimeout(function() {
                  if (isActive && hlsInstance) {
                    try {
                      hlsInstance.startLoad();
                    } catch (e) {
                      startHls(urls.fallback);
                    }
                  }
                }, netDelay);
                break;

              case HlsClass.ErrorTypes.MEDIA_ERROR:
                try {
                  hlsInstance.recoverMediaError();
                } catch (e) {
                  try {
                    hlsInstance.swapAudioCodec();
                    hlsInstance.recoverMediaError();
                  } catch (e2) {
                    startHls(urls.fallback);
                  }
                }
                break;

              default:
                handleOffline();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.onloadedmetadata = function() {
          if (connectTimeout) {
            clearTimeout(connectTimeout);
            connectTimeout = null;
          }
          isOnline = true;
          showOnline();
          currentAttempt = 0;
          startWatchdog();
          video.play().catch(function() {});
        };
        video.onerror = function() {
          if (!isFallback && streamUrl.includes('_sub.m3u8')) {
            isFallback = true;
            video.src = urls.fallback;
            return;
          }
          handleOffline();
        };
      } else {
        handleOffline();
      }
    }

    video.onplaying = function() {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      isOnline = true;
      showOnline();
      currentAttempt = 0;
      lastProgressTime = Date.now();
    };
    video.oncanplay = function() {
      isOnline = true;
      showOnline();
    };

    const startDelay = Math.min(index * 150, 2500);
    const timer = setTimeout(function() {
      if (isActive) {
        startHls(urls.primary);
      }
    }, startDelay);

    if (btnRetry) {
      btnRetry.addEventListener('click', function(e) {
        e.stopPropagation();
        if (probeTimer) {
          clearInterval(probeTimer);
          probeTimer = null;
        }
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
        if (probeTimer) clearInterval(probeTimer);
        cleanupHls();
      },
      reload: function() {
        if (probeTimer) {
          clearInterval(probeTimer);
          probeTimer = null;
        }
        isFallback = false;
        currentAttempt = 0;
        startHls(urls.primary);
      }
    });
  }

  // Master stream dispatcher: RTSP defaults to MJPEG, RTMP defaults to HLS
  function initCameraStream(cam, cell, index) {
    if (isCameraRtsp(cam)) {
      initMjpegStream(cam, cell, index);
    } else {
      initHlsStream(cam, cell, index);
    }
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
        const isRtsp = isCameraRtsp(cam);
        const protocol = (cam.protocol || (isRtsp ? 'RTSP' : 'RTMP')).toUpperCase();
        const streamType = isRtsp ? 'MJPEG' : 'HLS';
        const location = cam.location || ((cam.city || 'Itamaraju') + ' - ' + (cam.stateUf || 'BA'));

        return (
          '<div class="cam-cell ' + (isFocused ? 'active-focus' : '') + '" data-camera-id="' + cam.id + '" title="Duplo clique para focar">' +
            '<div class="cam-video-container">' +
              (isRtsp
                ? '<img class="cam-video cam-mjpeg" alt="' + escapeHtml(camName) + '" />'
                : '<video class="cam-video" autoplay playsinline muted></video>'
              ) +
            '</div>' +

            '<!-- Channel Badge Top-Left -->' +
            '<div class="cam-tag-channel">' +
              '<span class="ping-dot"></span>' +
              '<span>[CH ' + camNumber + ']</span>' +
              '<span class="cam-tag-protocol ' + (isRtsp ? 'rtsp' : '') + '">' + protocol + ' &bull; ' + streamType + '</span>' +
            '</div>' +

            '<!-- OSD Top-Right Recording Indicator -->' +
            '<div class="osd-top">' +
              '<div class="osd-cloud-rec"><span class="rec-dot"></span>NUVEM</div>' +
            '</div>' +

            '<!-- Loading Overlay State -->' +
            '<div class="cam-loading-overlay">' +
              '<div class="loading-spinner-ring"></div>' +
              '<div class="loading-title">Carregando Câmera...</div>' +
              '<div class="loading-subtitle">Conectando ao fluxo ' + protocol + ' (' + streamType + ')...</div>' +
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

  // Deterministic camera sort so channel slots and order remain stable
  function sortCameras(list) {
    return (list || []).slice().sort(function(a, b) {
      const nameA = a.name || a.id || '';
      const nameB = b.name || b.id || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  // Update cell tags and labels without rebuilding active video elements
  function updateCameraCellsMeta() {
    if (!videoGrid) return;
    currentCameras.forEach(function(cam) {
      const cell = videoGrid.querySelector('.cam-cell[data-camera-id="' + cam.id + '"]');
      if (!cell) return;
      const titleEl = cell.querySelector('.osd-cam-title');
      if (titleEl && cam.name) {
        titleEl.textContent = cam.name.toUpperCase();
      }
    });
  }

  // Load Cameras from Central ITL Server
  async function loadCameras(forceRender) {
    if (camCountLabel && (!videoGrid || !videoGrid.querySelector('.cam-cell'))) {
      camCountLabel.textContent = 'Sincronizando câmeras...';
    }

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

      const sortedCams = sortCameras(Array.isArray(cameras) ? cameras : []);
      currentCameras = sortedCams;
      const onlineCount = currentCameras.filter(function(c) { return c.status !== 'OFFLINE'; }).length;
      if (camCountLabel) {
        camCountLabel.textContent = onlineCount + ' / ' + currentCameras.length + ' Câmeras Online';
      }

      const prevIds = (lastLoadedCameraIds || []).join(',');
      const newIds = currentCameras.map(function(c) { return c.id; }).join(',');
      const gridHasCells = !!videoGrid.querySelector('.cam-cell');

      // Crucial stability fix: Never tear down running streams if cameras are already rendered
      if (forceRender || !gridHasCells || prevIds !== newIds) {
        lastLoadedCameraIds = currentCameras.map(function(c) { return c.id; });
        renderCameraGrid();
      } else {
        updateCameraCellsMeta();
      }
    } catch (e) {
      console.error('Erro ao carregar câmeras:', e);
      if (camCountLabel && (!videoGrid || !videoGrid.querySelector('.cam-cell'))) {
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

  // Auto-refresh camera list metadata every 60s without disturbing active streams
  setInterval(function() {
    if (loginSection && loginSection.classList.contains('hidden')) {
      loadCameras(false);
    }
  }, 60000);

  // Run initial session check
  console.log('[ITL DVR] Iniciando sessão...');
  init();
})();
