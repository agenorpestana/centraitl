import React, { useState, useEffect, useRef } from 'react';
import { CameraEditModal } from './CameraEditModal';
import {
  Camera as CameraIcon,
  Mic,
  Maximize2,
  Radio,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Search,
  Filter,
  Tv,
  Grid,
  X,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { Camera, User } from '../types';
import { LiveStreamPlayer } from './LiveStreamPlayer';

interface CameraGridProps {
  cameras: Camera[];
  activeUser: User;
  onSelectCamera: (cam: Camera) => void;
  onTriggerTestAlert: (camId: string) => void;
  onUpdateCamera?: (id: string, cameraData: Partial<Camera>) => void;
  onDvrModeChange?: (isDvr: boolean) => void;
}

export const CameraGrid: React.FC<CameraGridProps> = ({
  cameras,
  activeUser,
  onSelectCamera,
  onTriggerTestAlert,
  onUpdateCamera,
  onDvrModeChange,
}) => {
  // Mode State
  const [isDvrMode, setIsDvrMode] = useState<boolean>(false);

  // Normal Mode State
  const [gridColumns, setGridColumns] = useState<number>(2); // 1 (1x1), 2 (2x2), 3 (3x3), 4 (4x4)
  const [pageSize, setPageSize] = useState<number>(8); // 4, 6, 8, 12, 16, 100
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // DVR Mode State
  const [dvrGridSize, setDvrGridSize] = useState<number>(4); // 4 (2x2), 8 (2x4), 16 (4x4)
  const [dvrPage, setDvrPage] = useState<number>(1);
  const [selectedDvrCamId, setSelectedDvrCamId] = useState<string | null>(null);
  const [dvrFocusedCamId, setDvrFocusedCamId] = useState<string | null>(null);
  const [isDvrFullscreen, setIsDvrFullscreen] = useState<boolean>(false);
  const [isAutoPatrol, setIsAutoPatrol] = useState<boolean>(false);
  const [patrolIntervalSec, setPatrolIntervalSec] = useState<number>(10);
  const dvrContainerRef = useRef<HTMLDivElement>(null);

  // Audio / Mic / Streams
  const [activeMicCameraId, setActiveMicCameraId] = useState<string | null>(null);
  const [mutedCameraIds, setMutedCameraIds] = useState<Record<string, boolean>>({});
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [autoRefreshKey, setAutoRefreshKey] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Fullscreen change listener to sync isDvrFullscreen state without resetting DVR mode
  useEffect(() => {
    const handleFsChange = () => {
      setIsDvrFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Filter accessible cameras based on user permissions
  const accessibleCameras = React.useMemo(() => {
    if (activeUser.role === 'ADMIN') return cameras;
    if (!activeUser.allowedCameraIds || activeUser.allowedCameraIds.includes('ALL')) return cameras;
    return cameras.filter((c) => activeUser.allowedCameraIds.includes(c.id));
  }, [cameras, activeUser]);

  // Unique cities list for filtering
  const uniqueCities = React.useMemo(() => {
    const citiesSet = new Set<string>();
    accessibleCameras.forEach((c) => {
      const cityLabel = c.city
        ? c.stateUf
          ? `${c.city} - ${c.stateUf}`
          : c.city
        : c.location;
      if (cityLabel && cityLabel.trim()) {
        citiesSet.add(cityLabel.trim());
      }
    });
    return Array.from(citiesSet).sort();
  }, [accessibleCameras]);

  // Filtered cameras based on city dropdown & text search query
  const filteredCameras = React.useMemo(() => {
    return accessibleCameras.filter((cam) => {
      const cityLabel = cam.city
        ? cam.stateUf
          ? `${cam.city} - ${cam.stateUf}`
          : cam.city
        : cam.location;

      const matchesCity =
        selectedCity === 'ALL' ||
        !selectedCity ||
        (cityLabel && cityLabel.toLowerCase() === selectedCity.toLowerCase());

      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        cam.name.toLowerCase().includes(q) ||
        (cam.location && cam.location.toLowerCase().includes(q)) ||
        cam.id.toLowerCase().includes(q);

      return matchesCity && matchesQuery;
    });
  }, [accessibleCameras, selectedCity, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setDvrPage(1);
  }, [selectedCity, searchQuery, pageSize]);

  // Normal Mode Pagination
  const totalNormalPages = Math.max(1, Math.ceil(filteredCameras.length / pageSize));
  const paginatedNormalCameras = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCameras.slice(start, start + pageSize);
  }, [filteredCameras, currentPage, pageSize]);

  // DVR Mode Pagination
  const dvrTotalPages = Math.max(1, Math.ceil(filteredCameras.length / dvrGridSize));
  const dvrPageCameras = React.useMemo(() => {
    const start = (dvrPage - 1) * dvrGridSize;
    return filteredCameras.slice(start, start + dvrGridSize);
  }, [filteredCameras, dvrPage, dvrGridSize]);

  // Auto-Patrol / Ronda Automática timer in DVR mode
  useEffect(() => {
    if (!isDvrMode || !isAutoPatrol || filteredCameras.length === 0) return;

    const timer = setInterval(() => {
      if (dvrFocusedCamId) {
        const currIdx = filteredCameras.findIndex((c) => c.id === dvrFocusedCamId);
        const nextIdx = (currIdx + 1) % filteredCameras.length;
        setDvrFocusedCamId(filteredCameras[nextIdx].id);
      } else {
        setDvrPage((prev) => (prev >= dvrTotalPages ? 1 : prev + 1));
      }
    }, patrolIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [isDvrMode, isAutoPatrol, dvrFocusedCamId, filteredCameras, patrolIntervalSec, dvrTotalPages]);

  // Toggle DVR Mode
  const toggleDvrMode = () => {
    const next = !isDvrMode;
    setIsDvrMode(next);
    if (onDvrModeChange) {
      onDvrModeChange(next);
    }
  };

  // Toggle Fullscreen on element
  const toggleFullscreen = (cam?: Camera) => {
    if (cam) {
      onSelectCamera(cam);
      return;
    }
    if (dvrContainerRef.current) {
      if (!document.fullscreenElement) {
        dvrContainerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Auto Refresh & Audio effects
  useEffect(() => {
    const TWO_MINUTES_MS = 2 * 60 * 1000;
    const interval = setInterval(() => {
      if (!document.fullscreenElement) {
        setAutoRefreshKey((prev) => prev + 1);
      }
    }, TWO_MINUTES_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeMicCameraId) {
      setAudioLevel(0);
      return;
    }
    const interval = setInterval(() => {
      setAudioLevel(Math.floor(Math.random() * 80) + 20);
    }, 120);
    return () => clearInterval(interval);
  }, [activeMicCameraId]);

  const toggleMute = (camId: string) => {
    setMutedCameraIds((prev) => ({ ...prev, [camId]: !prev[camId] }));
  };

  // ==========================================
  // RENDER DVR MODE VIEW (Modo Estilo DVR)
  // ==========================================
  if (isDvrMode) {
    const focusedCam = dvrFocusedCamId
      ? filteredCameras.find((c) => c.id === dvrFocusedCamId) || null
      : null;

    const focusedIdx = focusedCam ? filteredCameras.findIndex((c) => c.id === focusedCam.id) : -1;

    const handlePrevFocusedCam = () => {
      if (filteredCameras.length === 0) return;
      const prevIdx = (focusedIdx - 1 + filteredCameras.length) % filteredCameras.length;
      setDvrFocusedCamId(filteredCameras[prevIdx].id);
    };

    const handleNextFocusedCam = () => {
      if (filteredCameras.length === 0) return;
      const nextIdx = (focusedIdx + 1) % filteredCameras.length;
      setDvrFocusedCamId(filteredCameras[nextIdx].id);
    };

    const emptySlotsCount = Math.max(0, dvrGridSize - dvrPageCameras.length);
    const gridColsClass =
      dvrGridSize === 4
        ? 'grid-cols-2 grid-rows-2'
        : dvrGridSize === 8
        ? 'grid-cols-2 sm:grid-cols-4 grid-rows-2'
        : 'grid-cols-2 sm:grid-cols-4 grid-rows-4';

    return (
      <div
        ref={dvrContainerRef}
        className="bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[calc(100vh-100px)] text-slate-100"
      >
        {/* DVR Top Header */}
        <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Tv className="w-4 h-4 animate-pulse" />
              <span>Modo DVR Central ITL</span>
            </div>
            <span className="text-slate-600">|</span>
            {focusedCam ? (
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  CANAL {String(focusedIdx + 1).padStart(2, '0')} / {filteredCameras.length}
                </span>
                <span className="text-xs font-semibold text-slate-200">{focusedCam.name}</span>
                <span className="text-[10px] text-slate-400 hidden sm:inline font-mono">
                  {focusedCam.location || focusedCam.city || 'Central ITL'}
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.5 rounded font-bold">
                  FULL HD 1080p
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 hidden sm:inline">
                Canais {filteredCameras.length === 0 ? 0 : (dvrPage - 1) * dvrGridSize + 1} a{' '}
                {Math.min(dvrPage * dvrGridSize, filteredCameras.length)} de {filteredCameras.length} câmeras (SD 360p @ 30 FPS)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {focusedCam && (
              <button
                onClick={() => setDvrFocusedCamId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition border border-slate-700"
                title="Voltar ao Mosaico Multi-Câmeras"
              >
                <Grid className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ver Mosaico (Grade)</span>
              </button>
            )}

            <button
              onClick={() => setIsAutoPatrol((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition border ${
                isAutoPatrol
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Alternar Ronda Automática de Câmeras"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isAutoPatrol ? 'animate-spin' : ''}`} />
              <span>Ronda ({patrolIntervalSec}s)</span>
            </button>

            <button
              onClick={() => toggleFullscreen()}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white transition"
              title={isDvrFullscreen ? 'Sair da Tela Cheia' : 'Alternar Tela Cheia'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleDvrMode}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Sair do DVR</span>
            </button>
          </div>
        </div>

        {/* DVR Main Content Area */}
        {focusedCam ? (
          /* Focused Single Camera In-DVR View (Full HD 1080p) */
          <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden min-h-[500px]">
            {/* LiveStreamPlayer in Full HD Mode */}
            <div className="w-full h-full flex-1 relative flex items-center justify-center">
              <LiveStreamPlayer
                key={`dvr-focus-${focusedCam.id}-${autoRefreshKey}`}
                camera={focusedCam}
                isMuted={mutedCameraIds[focusedCam.id] ?? false}
                onSelectCamera={() => {}}
                showOverlayControls={true}
                hideBottomCard={true}
                useSubStream={false}
              />
            </div>

            {/* In-DVR Floating Navigation Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl flex items-center space-x-3 backdrop-blur-md shadow-2xl">
              <button
                onClick={handlePrevFocusedCam}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center space-x-1 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Canal Anterior</span>
              </button>

              <span className="text-xs font-mono font-bold text-emerald-400 px-2">
                CH {String(focusedIdx + 1).padStart(2, '0')} / {filteredCameras.length}
              </span>

              <button
                onClick={handleNextFocusedCam}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center space-x-1 transition"
              >
                <span>Próximo Canal</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-800" />

              <button
                onClick={() => setDvrFocusedCamId(null)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Mosaico</span>
              </button>
            </div>
          </div>
        ) : (
          /* Multi-Camera DVR Grid Container (SD 360p @ 30 FPS) */
          <div className={`flex-1 p-1 bg-neutral-950 grid ${gridColsClass} gap-1 min-h-[500px]`}>
            {/* Active Camera Tiles */}
            {dvrPageCameras.map((camera, idx) => {
              const isSelected = selectedDvrCamId === camera.id;
              const channelNumber = (dvrPage - 1) * dvrGridSize + idx + 1;
              const isMuted = mutedCameraIds[camera.id] === undefined ? true : mutedCameraIds[camera.id];

              return (
                <div
                  key={camera.id}
                  onClick={() => setSelectedDvrCamId(camera.id)}
                  onDoubleClick={() => setDvrFocusedCamId(camera.id)}
                  className={`relative bg-slate-950 border transition-all overflow-hidden flex flex-col group cursor-pointer ${
                    isSelected
                      ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/20 z-10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Channel Label Top Left */}
                  <div className="absolute top-1 left-1.5 z-20 bg-black/85 text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold flex items-center space-x-1.5 backdrop-blur-sm shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>CH{channelNumber.toString().padStart(2, '0')}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-sans font-bold ${
                        camera.protocol === 'RTSP'
                          ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-800'
                          : 'bg-emerald-950/90 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {camera.protocol === 'RTSP' ? 'RTSP • MJPEG' : `${camera.protocol || 'RTMP'} • HLS`}
                    </span>
                  </div>

                  {/* Top Right Controls */}
                  <div className="absolute top-1 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition flex items-center space-x-1 bg-black/80 p-1 rounded-md">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute(camera.id);
                      }}
                      className="p-1 text-slate-300 hover:text-white"
                      title={isMuted ? 'Desmutar' : 'Mutar'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDvrFocusedCamId(camera.id);
                      }}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                      title="Expandir em Tela Cheia no DVR"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Video Stream Player (SD 360p for fast multi-tile performance) */}
                  <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    <LiveStreamPlayer
                      key={`${camera.id}-dvr-${autoRefreshKey}`}
                      camera={camera}
                      isMuted={isMuted}
                      onSelectCamera={() => setDvrFocusedCamId(camera.id)}
                      showOverlayControls={false}
                      hideBottomCard={true}
                      useSubStream={true}
                    />
                  </div>

                  {/* DVR Bottom Label Bar (Name of Camera) */}
                  <div className="bg-slate-900/90 border-t border-slate-800 px-2.5 py-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 truncate text-[11px]">{camera.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
                      {camera.location || camera.city || 'Ao Vivo'}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Empty DVR Slots */}
            {Array.from({ length: emptySlotsCount }).map((_, slotIdx) => {
              const slotNum = (dvrPage - 1) * dvrGridSize + dvrPageCameras.length + slotIdx + 1;
              return (
                <div
                  key={`empty-slot-${slotIdx}`}
                  className="relative bg-black border border-slate-900 flex flex-col items-center justify-center p-4 text-center select-none"
                >
                  <div className="absolute top-1 left-1.5 bg-slate-900/80 text-[10px] font-mono text-slate-600 px-1.5 py-0.5 rounded">
                    CH{slotNum.toString().padStart(2, '0')}
                  </div>

                  <span className="text-xs text-slate-600 font-mono">Sem Sinal / Canal Livre</span>
                </div>
              );
            })}
          </div>
        )}

        {/* DVR Bottom Toolbar */}
        {!focusedCam && (
          <div className="bg-slate-950 border-t border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            {/* Left Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleFullscreen()}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white transition"
                title={isDvrFullscreen ? 'Sair da Tela Cheia' : 'Alternar Tela Cheia'}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Center Grid Selector Buttons */}
            <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Layout DVR:</span>
              <button
                onClick={() => {
                  setDvrGridSize(4);
                  setDvrPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  dvrGridSize === 4 ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                4x4
              </button>
              <button
                onClick={() => {
                  setDvrGridSize(8);
                  setDvrPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  dvrGridSize === 8 ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                8x8
              </button>
              <button
                onClick={() => {
                  setDvrGridSize(16);
                  setDvrPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  dvrGridSize === 16 ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                16x16
              </button>
            </div>

            {/* Right Pagination Controls */}
            <div className="flex items-center space-x-2">
              <button
                disabled={dvrPage <= 1}
                onClick={() => setDvrPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 font-medium flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <span className="text-xs font-bold text-slate-200 px-2 font-mono">
                Página {dvrPage} de {dvrTotalPages}
              </span>

              <button
                disabled={dvrPage >= dvrTotalPages}
                onClick={() => setDvrPage((p) => Math.min(dvrTotalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 font-medium flex items-center space-x-1"
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER NORMAL MODE VIEW (Matriz de Monitoramento)
  // ==========================================
  return (
    <div className="space-y-4">
      {/* Header Bar Controls & Filters */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              Matriz de Monitoramento Central ITL
            </h2>
            <p className="text-xs text-slate-400">
              {filteredCameras.length} Câmera(s) encontrada(s) ({accessibleCameras.length} autorizadas para seu perfil)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Page Size Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Exibir:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
              >
                <option value={4} className="bg-slate-900 text-slate-200">4 por pág</option>
                <option value={6} className="bg-slate-900 text-slate-200">6 por pág</option>
                <option value={8} className="bg-slate-900 text-slate-200">8 por pág</option>
                <option value={12} className="bg-slate-900 text-slate-200">12 por pág</option>
                <option value={16} className="bg-slate-900 text-slate-200">16 por pág</option>
                <option value={100} className="bg-slate-900 text-slate-200">Todas ({filteredCameras.length})</option>
              </select>
            </div>

            {/* Grid Layout Switcher & DVR Button */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setGridColumns(1)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                  gridColumns === 1 ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                1x1
              </button>
              <button
                onClick={() => setGridColumns(2)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                  gridColumns === 2 ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                2x2
              </button>
              <button
                onClick={() => setGridColumns(3)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                  gridColumns === 3 ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                3x3
              </button>
              <button
                onClick={() => setGridColumns(4)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                  gridColumns === 4 ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                4x4
              </button>

              {/* DVR Mode Toggle Button */}
              <button
                onClick={toggleDvrMode}
                className="ml-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs rounded-lg transition shadow-md flex items-center space-x-1"
                title="Alternar para visualização estilo DVR"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>DVR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar: City Dropdown & Name Search */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* City Filter Dropdown */}
          <div className="relative flex-1 sm:max-w-xs">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-9 pr-8 py-2 rounded-xl outline-none focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="ALL">Todas as Cidades / Locais</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Name Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome ou local da câmera..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-9 pr-8 py-2 rounded-xl outline-none focus:border-emerald-500 placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reset Filters Button */}
          {(selectedCity !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCity('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center justify-center space-x-1 shrink-0 transition"
              title="Limpar filtros"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Camera Stream Grid */}
      {filteredCameras.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <CameraIcon className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Nenhuma Câmera Encontrada</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Nenhuma câmera corresponde aos filtros selecionados. Tente buscar por outro nome de câmera ou alterar o local escolhido.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            gridColumns === 1
              ? 'grid-cols-1'
              : gridColumns === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : gridColumns === 3
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}
        >
          {paginatedNormalCameras.map((camera) => {
            const isMicActive = activeMicCameraId === camera.id;
            const isMuted = mutedCameraIds[camera.id] === undefined ? true : mutedCameraIds[camera.id];

            return (
              <div
                key={camera.id}
                className={`group relative bg-slate-900 border rounded-2xl overflow-hidden shadow-lg transition-all ${
                  camera.status === 'ALERT'
                    ? 'border-rose-500 ring-2 ring-rose-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Camera Live Video Player */}
                <div className="w-full relative">
                  <LiveStreamPlayer
                    key={`${camera.id}-${autoRefreshKey}`}
                    camera={camera}
                    isMuted={isMuted}
                    onSelectCamera={onSelectCamera}
                    showOverlayControls={true}
                    useSubStream={true}
                  />

                  {/* Live 2-Way RTMP Audio Active Bar */}
                  {isMicActive && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-rose-950/90 border-y border-rose-500/80 py-3 px-4 flex flex-col items-center justify-center space-y-2 backdrop-blur-md z-20">
                      <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold animate-pulse">
                        <Mic className="w-4 h-4 text-rose-400" />
                        <span>TRANSMITINDO ÁUDIO BIDIRECIONAL (RTMP)</span>
                      </div>

                      {/* Audio Waveform Simulator */}
                      <div className="flex items-center space-x-1 h-6">
                        {[...Array(12)].map((_, i) => {
                          const h = Math.max(4, (audioLevel * (i % 3 === 0 ? 1 : 0.6)) / 3);
                          return (
                            <div
                              key={i}
                              className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                              style={{ height: `${h}px` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls Footer */}
                <div className="p-2.5 bg-slate-900 flex items-center justify-between border-t border-slate-800">
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-slate-200 truncate">{camera.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {camera.location || camera.city || 'Central ITL'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    {/* Audio Mute Button */}
                    <button
                      onClick={() => toggleMute(camera.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                      title={isMuted ? 'Ativar Som da Câmera' : 'Silenciar Câmera'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Edit Camera Button */}
                    {activeUser.customPermissions.canManageCameras && onUpdateCamera && (
                      <button
                        onClick={() => setEditingCamera(camera)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        title="Editar configurações da câmera"
                      >
                        <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    )}

                    {/* Expand Modal */}
                    <button
                      onClick={() => onSelectCamera(camera)}
                      className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                      title="Detalhes da câmera"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Normal Mode Pagination Controls (Até 10 câmeras por página) */}
      {filteredCameras.length > 0 && totalNormalPages > 1 && (
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-400">
            Mostrando{' '}
            <strong className="text-slate-200">
              {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredCameras.length)}
            </strong>{' '}
            de <strong className="text-slate-200">{filteredCameras.length}</strong> Câmeras
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 font-medium flex items-center space-x-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {/* Direct Page Buttons */}
            {Array.from({ length: totalNormalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl font-bold transition ${
                    currentPage === pageNum
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              disabled={currentPage >= totalNormalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalNormalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 font-medium flex items-center space-x-1 transition"
            >
              <span>Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Camera Edit Modal */}
      {editingCamera && onUpdateCamera && (
        <CameraEditModal
          camera={editingCamera}
          onClose={() => setEditingCamera(null)}
          onSave={(id, updatedData) => {
            onUpdateCamera(id, updatedData);
            setEditingCamera(null);
          }}
        />
      )}
    </div>
  );
};
