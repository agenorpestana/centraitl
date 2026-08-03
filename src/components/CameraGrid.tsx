import React, { useState, useEffect, useRef } from 'react';
import { CameraEditModal } from './CameraEditModal';
import {
  Camera as CameraIcon,
  Mic,
  MicOff,
  Maximize2,
  Lock,
  Radio,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sliders,
  Sparkles,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Video,
  Pencil,
} from 'lucide-react';
import { Camera, User } from '../types';
import { LiveStreamPlayer } from './LiveStreamPlayer';

interface CameraGridProps {
  cameras: Camera[];
  activeUser: User;
  onSelectCamera: (cam: Camera) => void;
  onTriggerTestAlert: (camId: string) => void;
  onUpdateCamera?: (id: string, cameraData: Partial<Camera>) => void;
}

export const CameraGrid: React.FC<CameraGridProps> = ({
  cameras,
  activeUser,
  onSelectCamera,
  onTriggerTestAlert,
  onUpdateCamera,
}) => {
  const [gridColumns, setGridColumns] = useState<number>(2); // 1, 2, 3 columns
  const [activeMicCameraId, setActiveMicCameraId] = useState<string | null>(null);
  const [mutedCameraIds, setMutedCameraIds] = useState<Record<string, boolean>>({});
  const [liveTimestamps, setLiveTimestamps] = useState<Record<string, string>>({});
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [autoRefreshKey, setAutoRefreshKey] = useState<number>(0);

  // Audio stream simulator state
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const accessibleCameras = React.useMemo(() => {
    if (activeUser.role === 'ADMIN') return cameras;
    if (!activeUser.allowedCameraIds || activeUser.allowedCameraIds.includes('ALL')) return cameras;
    return cameras.filter((c) => activeUser.allowedCameraIds.includes(c.id));
  }, [cameras, activeUser]);

  // Auto-refresh streams every 2 minutes (120,000 ms) unless full screen mode is active
  useEffect(() => {
    const TWO_MINUTES_MS = 2 * 60 * 1000;
    const interval = setInterval(() => {
      const isFullscreenActive = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isFullscreenActive) {
        setAutoRefreshKey((prev) => prev + 1);
      }
    }, TWO_MINUTES_MS);

    return () => clearInterval(interval);
  }, []);

  // Update timestamps every second
  useEffect(() => {
    const interval = setInterval(() => {
      const nowStr = new Date().toLocaleString('pt-BR');
      const updated: Record<string, string> = {};
      accessibleCameras.forEach((c) => {
        updated[c.id] = nowStr;
      });
      setLiveTimestamps(updated);
    }, 1000);
    return () => clearInterval(interval);
  }, [accessibleCameras]);

  // Audio level simulator when 2-way audio mic is active
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

  const toggleMic = (camId: string) => {
    if (!activeUser.customPermissions.canUseTwoWayAudio) {
      alert('Sua conta não tem permissão para usar Áudio Bidirecional (RTMP). Solicite ao Administrador.');
      return;
    }
    if (activeMicCameraId === camId) {
      setActiveMicCameraId(null);
    } else {
      setActiveMicCameraId(camId);
    }
  };

  const toggleMute = (camId: string) => {
    setMutedCameraIds((prev) => ({ ...prev, [camId]: !prev[camId] }));
  };

  return (
    <div className="space-y-4">
      {/* Header bar controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Matriz de Monitoramento Central ITL
          </h2>
          <p className="text-xs text-slate-400">
            {accessibleCameras.length} Câmera(s) autorizada(s) para seu perfil ({cameras.length} cadastradas no sistema)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Grid Layout Switcher */}
          <span className="text-xs text-slate-400 hidden sm:inline">Visualização:</span>
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
          </div>
        </div>
      </div>

      {/* Camera Stream Grid */}
      {accessibleCameras.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <CameraIcon className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Nenhuma Câmera Autorizada</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Sua conta de usuário não possui permissão de acesso para nenhuma câmera cadastrada no momento. Entre em contato com o Administrador no painel de Gerenciamento de Usuários.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            gridColumns === 1
              ? 'grid-cols-1'
              : gridColumns === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {accessibleCameras.map((camera) => {
            const isMicActive = activeMicCameraId === camera.id;
            // Default audio is MUTED (true) for all live cameras to prevent noise overlay
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
