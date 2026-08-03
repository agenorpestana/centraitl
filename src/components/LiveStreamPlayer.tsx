import React, { useState, useEffect, useRef } from 'react';
import {
  Camera as CameraIcon,
  Video,
  Radio,
  RefreshCw,
  Lock,
  Maximize2,
  Minimize2,
  Webcam,
  Link2,
  WifiOff,
  Activity,
  Terminal,
  X,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RadioTower,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Camera } from '../types';

interface LiveStreamPlayerProps {
  camera: Camera;
  className?: string;
  zoomLevel?: number;
  isMuted?: boolean;
  onSelectCamera?: (cam: Camera) => void;
  showOverlayControls?: boolean;
}

const cleanDoubleUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  let cleaned = url.replace(/(https?:\/\/[^/]+)(https?:\/\/)/g, '$2');
  cleaned = cleaned.replace(/([^:]\/)\/+/g, '$1');
  return cleaned;
};

const getInitialVideoUrl = (cam: Camera) => {
  if (cam.videoStreamUrl && cam.videoStreamUrl.trim() !== '') {
    let url = cleanDoubleUrl(cam.videoStreamUrl);
    if (url.includes('/live/') && !url.endsWith('.m3u8')) url += '.m3u8';
    return url;
  }
  const key = cam.streamKey || (cam.id ? (cam.id.startsWith('cam-') ? `cam_${cam.id.replace('cam-', '')}` : cam.id) : 'stream');
  const cleanKey = key.replace(/^cam-/, '').replace(/^cam_/, '');
  return `/live/cam_${cleanKey}.m3u8`;
};

type ConnectionState = 'LOADING' | 'ONLINE' | 'OFFLINE';

export const LiveStreamPlayer: React.FC<LiveStreamPlayerProps> = ({
  camera,
  className = '',
  zoomLevel = 1,
  isMuted = true,
  onSelectCamera,
  showOverlayControls = true,
}) => {
  const streamKey = camera.streamKey || (camera.id ? (camera.id.startsWith('cam-') ? `cam_${camera.id.replace('cam-', '')}` : camera.id) : 'stream');
  const cleanKey = streamKey.replace(/^cam-/, '').replace(/^cam_/, '');

  const [streamMode, setStreamMode] = useState<'VIDEO' | 'WEBCAM'>(
    camera.isLiveWebcam ? 'WEBCAM' : 'VIDEO'
  );

  // Default RTSP to direct stream MJPEG, RTMP to HLS video
  const [useMjpegStream, setUseMjpegStream] = useState<boolean>(
    camera.protocol === 'RTSP' ? true : false
  );

  const [retryCount, setRetryCount] = useState<number>(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>('LOADING');
  const [videoUrl, setVideoUrl] = useState<string>(() => cleanDoubleUrl(getInitialVideoUrl(camera)));
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrlInput, setTempUrlInput] = useState(() => cleanDoubleUrl(camera.fullRtmpUrl || camera.rtmpUrl || camera.rtspUrl || videoUrl));

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rawStreamUrl = camera.rtspUrl || camera.rtmpUrl || camera.fullRtmpUrl || videoUrl || '';
  const mjpegUrl = `/api/cameras/${camera.id}/stream?key=cam_${cleanKey}&url=${encodeURIComponent(rawStreamUrl)}&t=${retryCount}`;

  const displayStreamUrl = React.useMemo(() => {
    if (camera.protocol === 'RTSP') {
      return camera.rtspUrl || rawStreamUrl;
    }
    let candidate = camera.rtmpUrl || camera.fullRtmpUrl || rawStreamUrl;
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      candidate = candidate.replace(/^https?:\/\//, 'rtmp://').replace(/\.m3u8$/, '');
      if (!candidate.includes(':1935') && !candidate.includes(':80')) {
        candidate = candidate.replace(/(rtmp:\/\/[^/:]+)(\/.*)?$/, '$1:1935$2');
      }
    }
    return candidate;
  }, [camera, rawStreamUrl]);

  // Sync state whenever camera prop changes
  useEffect(() => {
    const initialUrl = cleanDoubleUrl(getInitialVideoUrl(camera));
    setVideoUrl(initialUrl);
    setStreamMode(camera.isLiveWebcam ? 'WEBCAM' : 'VIDEO');
    setUseMjpegStream(camera.protocol === 'RTSP');
    setTempUrlInput(cleanDoubleUrl(camera.fullRtmpUrl || camera.rtmpUrl || camera.rtspUrl || initialUrl));
    setConnectionState('LOADING');
    setRetryCount(0);
  }, [camera.id, camera.videoStreamUrl, camera.rtspUrl, camera.rtmpUrl, camera.fullRtmpUrl, camera.protocol, camera.isLiveWebcam]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Diagnostic state for player
  const [playerDiag, setPlayerDiag] = useState<{
    loading: boolean;
    data?: any;
    error?: string;
  } | null>(null);

  const runPlayerDiag = async () => {
    setPlayerDiag({ loading: true });
    try {
      const res = await fetch('/api/cameras/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: camera.protocol || (camera.rtspUrl ? 'RTSP' : 'RTMP'),
          rtspUrl: camera.protocol === 'RTSP' ? camera.rtspUrl : '',
          rtmpUrl: camera.rtmpUrl || camera.fullRtmpUrl,
          streamKey: camera.streamKey || camera.id,
        }),
      });
      const data = await res.json();
      setPlayerDiag({ loading: false, data });
    } catch (e: any) {
      setPlayerDiag({ loading: false, error: e.message || 'Erro ao realizar diagnóstico' });
    }
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Connect stream
  const connectStream = () => {
    setConnectionState('LOADING');
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    if (camera.status === 'OFFLINE') {
      setConnectionState('OFFLINE');
    }
  };

  const handleVideoError = () => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    if (!useMjpegStream) {
      console.log(`[Stream Player] HLS indisponível para ${camera.protocol} (${camera.name}). Alternando para MJPEG...`);
      setUseMjpegStream(true);
      setConnectionState('LOADING');
      return;
    }
    setConnectionState('OFFLINE');
  };

  const handleVideoCanPlay = () => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    setConnectionState('ONLINE');
  };

  const handleRetryConnection = () => {
    connectStream();
    setRetryCount((prev) => prev + 1);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // Video playback and Hls.js initialization
  useEffect(() => {
    if (streamMode !== 'VIDEO' || !videoUrl) return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    connectStream();

    const isHls = videoUrl.endsWith('.m3u8') || videoUrl.includes('/live/');
    let hlsInstance: any = null;

    if (isHls && !useMjpegStream) {
      videoElement.removeAttribute('src');
      videoElement.load();

      // Quick fallback timer: If HLS manifest isn't parsed in 1.5s, switch to MJPEG for instant picture!
      const fastFallbackTimer = setTimeout(() => {
        setUseMjpegStream((current) => {
          if (!current) {
            console.log(`[Stream Player] HLS demorando para responder (${camera.name}). Alternando para fluxo direto instantâneo MJPEG...`);
            return true;
          }
          return current;
        });
      }, 1500);

      const initHls = () => {
        if ((window as any).Hls && (window as any).Hls.isSupported()) {
          const HlsClass = (window as any).Hls;
          hlsInstance = new HlsClass({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 10,
            manifestLoadingTimeOut: 2000,
            levelLoadingTimeOut: 2000,
          });
          hlsInstance.loadSource(videoUrl);
          hlsInstance.attachMedia(videoElement);
          hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, () => {
            clearTimeout(fastFallbackTimer);
            setConnectionState('ONLINE');
            videoElement.play().catch(() => {});
          });
          hlsInstance.on(HlsClass.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) {
              clearTimeout(fastFallbackTimer);
              handleVideoError();
            }
          });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          videoElement.src = videoUrl;
          videoElement.play().then(() => {
            clearTimeout(fastFallbackTimer);
            setConnectionState('ONLINE');
          }).catch(() => {});
        } else {
          clearTimeout(fastFallbackTimer);
          setUseMjpegStream(true);
        }
      };

      if ((window as any).Hls) {
        initHls();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.onload = initHls;
        script.onerror = () => {
          clearTimeout(fastFallbackTimer);
          setUseMjpegStream(true);
        };
        document.head.appendChild(script);
      }

      return () => {
        clearTimeout(fastFallbackTimer);
        if (hlsInstance) {
          try { hlsInstance.destroy(); } catch (e) {}
        }
      };
    } else {
      videoElement.src = videoUrl;
      videoElement.play().catch(() => {});
    }

    return () => {
      if (hlsInstance) {
        try { hlsInstance.destroy(); } catch (e) {}
      }
    };
  }, [videoUrl, streamMode, retryCount, useMjpegStream]);

  // Webcam mode setup
  useEffect(() => {
    if (streamMode !== 'WEBCAM') return;

    let mediaStream: MediaStream | null = null;
    connectStream();

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        mediaStream = stream;
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream;
        }
        setConnectionState('ONLINE');
      })
      .catch((err) => {
        console.error('Erro ao acessar webcam:', err);
        setConnectionState('OFFLINE');
      });

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [streamMode]);

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempUrlInput.trim()) {
      setVideoUrl(tempUrlInput.trim());
      setUseMjpegStream(false);
      setIsEditingUrl(false);
      connectStream();
    }
  };

  return (
    <div className={`w-full flex flex-col space-y-2.5 ${className}`}>
      {/* 1. CLEAN VIDEO CONTAINER (ZERO OVERLAYS COVERING THE IMAGE) */}
      <div
        ref={containerRef}
        className={`relative w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/90 shadow-2xl flex items-center justify-center transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none bg-black p-0 border-none'
            : 'aspect-video'
        }`}
      >
        {/* Stream Content */}
        {streamMode === 'VIDEO' && (
          useMjpegStream ? (
            <img
              src={mjpegUrl}
              alt={camera.name}
              crossOrigin="anonymous"
              onLoad={() => setConnectionState('ONLINE')}
              onError={handleVideoError}
              className={`w-full h-full ${isFullscreen ? 'object-contain max-h-screen' : 'object-cover'} transition duration-300 ${
                connectionState === 'ONLINE' ? 'opacity-100' : 'opacity-80'
              }`}
              style={{ transform: `scale(${zoomLevel})` }}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isMuted}
              crossOrigin="anonymous"
              onCanPlay={handleVideoCanPlay}
              onError={handleVideoError}
              className={`w-full h-full ${isFullscreen ? 'object-contain max-h-screen' : 'object-cover'} transition duration-300 ${
                connectionState === 'ONLINE' ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transform: `scale(${zoomLevel})` }}
            />
          )
        )}

        {streamMode === 'WEBCAM' && (
          <video
            ref={webcamVideoRef}
            autoPlay
            playsInline
            muted={isMuted}
            crossOrigin="anonymous"
            className={`w-full h-full ${isFullscreen ? 'object-contain max-h-screen' : 'object-cover'} transition duration-300 ${
              connectionState === 'ONLINE' ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: `scale(${zoomLevel})` }}
          />
        )}

        {/* LOADING STATE */}
        {connectionState === 'LOADING' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20 space-y-2">
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <Radio className="w-4 h-4 text-emerald-400 absolute animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Carregando Câmera...
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Conectando ao fluxo {camera.protocol || 'RTSP/RTMP'}...
            </p>
          </div>
        )}

        {/* OFFLINE STATE */}
        {connectionState === 'OFFLINE' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-20 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-500 shadow-lg">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-xs font-bold text-slate-200">
                Transmissão da Câmera Indisponível
              </p>
              <p className="text-[10px] text-slate-400">
                Sinal {camera.protocol || 'RTSP/RTMP'} sem pacotes no momento.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetryConnection}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-bold border border-slate-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reconectar</span>
              </button>
              <button
                onClick={runPlayerDiag}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs rounded-xl font-bold border border-emerald-500/40 transition"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Diagnóstico</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom-right Discrete Native Fullscreen Trigger Button inside image */}
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-2.5 right-2.5 p-2 bg-slate-950/80 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 rounded-xl border border-slate-700 transition z-20 shadow-lg flex items-center gap-1.5 text-xs font-bold"
          title={isFullscreen ? 'Sair da Tela Cheia (ESC)' : 'Expandir para Tela Cheia Total'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Sair Tela Cheia</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Tela Cheia</span>
            </>
          )}
        </button>
      </div>

      {/* 2. INFORMATION & CONTROLS CARDS (POSITIONS BELOW THE VIDEO IMAGE) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 shadow-xl">
        {/* Header Bar below video */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center space-x-2 truncate">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                connectionState === 'OFFLINE'
                  ? 'bg-rose-500'
                  : connectionState === 'LOADING'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <h4 className="font-bold text-sm text-slate-100 truncate">{camera.name}</h4>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                camera.protocol === 'RTSP'
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-800'
                  : 'bg-emerald-950/90 text-emerald-400 border-emerald-800'
              }`}
            >
              {camera.protocol || 'RTMP'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                connectionState === 'OFFLINE'
                  ? 'text-rose-400 bg-rose-950/80 border-rose-800'
                  : connectionState === 'LOADING'
                  ? 'text-amber-300 bg-amber-950/80 border-amber-800'
                  : 'text-emerald-400 bg-emerald-950/80 border-emerald-500/30'
              }`}
            >
              {connectionState === 'OFFLINE'
                ? 'OFF-LINE'
                : connectionState === 'LOADING'
                ? 'CARREGANDO'
                : 'ON-LINE / AO VIVO'}
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        {showOverlayControls && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-xs text-slate-300 font-semibold truncate">
                Local: {camera.location || `${camera.city || 'Itamaraju'} - ${camera.stateUf || 'BA'}`}
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={runPlayerDiag}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Teste / Diagnóstico</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-1"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Tela Cheia</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Stream URL Editor */}
      {isEditingUrl && (
        <form
          onSubmit={handleApplyCustomUrl}
          className="bg-slate-950 border border-cyan-500/50 p-3 rounded-2xl shadow-2xl space-y-2 mt-2"
        >
          <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
            <span>Digitar URL Customizada de Transmissão</span>
            <button type="button" onClick={() => setIsEditingUrl(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          <input
            type="url"
            value={tempUrlInput}
            onChange={(e) => setTempUrlInput(e.target.value)}
            placeholder="rtsp://... ou rtmp://... ou .m3u8"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-cyan-400"
            >
              Aplicar Nova Transmissão
            </button>
          </div>
        </form>
      )}

      {/* Diagnostic Player Modal */}
      {playerDiag && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-left">
            <button
              onClick={() => setPlayerDiag(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-xl bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Diagnóstico da Câmera: {camera.name}
                </h3>
                <p className="text-[10px] text-slate-400">
                  Validação de conexão e pacotes RTSP / RTMP em tempo real
                </p>
              </div>
            </div>

            {playerDiag.loading ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-300">
                  Testando conexão de rede e porta de mídia...
                </p>
              </div>
            ) : playerDiag.error ? (
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Erro no Diagnóstico</span>
                </div>
                <p className="text-slate-300">{playerDiag.error}</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    playerDiag.data?.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {playerDiag.data?.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs mb-1">
                      {playerDiag.data?.success ? 'SINAL CONECTADO COM SUCESSO' : 'SINAL NÃO DETECTADO'}
                    </h4>
                    <p className="text-slate-300 text-[11px]">{playerDiag.data?.message}</p>
                  </div>
                </div>

                {playerDiag.data?.logs && playerDiag.data.logs.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Logs do Transcodificador:</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-slate-400 max-h-36 overflow-y-auto space-y-1">
                      {playerDiag.data.logs.map((log: string, idx: number) => (
                        <div key={idx} className="truncate">{log}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setPlayerDiag(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
