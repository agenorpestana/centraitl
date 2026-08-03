import React, { useState, useEffect } from 'react';
import { CameraEditModal } from './CameraEditModal';
import {
  X,
  Mic,
  MicOff,
  Lock,
  Radio,
  Camera as CameraIcon,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sliders,
  ShieldAlert,
  Volume2,
  VolumeX,
  Download,
  Activity,
  Pencil,
} from 'lucide-react';
import { Camera, User } from '../types';
import { LiveStreamPlayer } from './LiveStreamPlayer';

interface CameraDetailModalProps {
  camera: Camera;
  activeUser: User;
  onClose: () => void;
  onTriggerTestAlert: (camId: string) => void;
  onUpdateCamera?: (id: string, cameraData: Partial<Camera>) => void;
}

export const CameraDetailModal: React.FC<CameraDetailModalProps> = ({
  camera,
  activeUser,
  onClose,
  onTriggerTestAlert,
  onUpdateCamera,
}) => {
  const [isMicTransmitting, setIsMicTransmitting] = useState(false);
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [ptzNotice, setPtzNotice] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isMicTransmitting) {
      setMicAudioLevel(0);
      return;
    }
    const interval = setInterval(() => {
      setMicAudioLevel(Math.floor(Math.random() * 85) + 15);
    }, 100);
    return () => clearInterval(interval);
  }, [isMicTransmitting]);

  const handlePtz = (direction: string) => {
    if (!activeUser.customPermissions.canControlPTZ) {
      alert('Sua conta não tem permissão para controlar PTZ.');
      return;
    }
    setPtzNotice(`Ajustando PTZ: ${direction}`);
    setTimeout(() => setPtzNotice(null), 1500);
  };

  const handleZoom = (type: 'in' | 'out') => {
    if (type === 'in') setZoomLevel((prev) => Math.min(prev + 0.5, 4));
    else setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleMicToggle = () => {
    if (!activeUser.customPermissions.canUseTwoWayAudio) {
      alert('Sua conta não possui permissão para usar Áudio Bidirecional.');
      return;
    }
    setIsMicTransmitting(!isMicTransmitting);
  };

  const handleTakeSnapshot = () => {
    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {camera.name}
              </h3>
              <p className="text-xs text-slate-400">{camera.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeUser.customPermissions.canManageCameras && onUpdateCamera && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                title="Editar Configurações da Câmera"
              >
                <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                <span>Editar Câmera</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isEditing && onUpdateCamera && (
          <CameraEditModal
            camera={camera}
            onClose={() => setIsEditing(false)}
            onSave={(id, updatedData) => {
              onUpdateCamera(id, updatedData);
              setIsEditing(false);
            }}
          />
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 p-4 sm:p-6 gap-6 overflow-y-auto">
          {/* Main Video Screen */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative w-full">
              <LiveStreamPlayer
                camera={camera}
                zoomLevel={zoomLevel}
                isMuted={isMuted}
                showOverlayControls={true}
              />

              {/* PTZ Action Notice */}
              {ptzNotice && (
                <div className="absolute top-3 right-3 bg-cyan-950/90 text-cyan-200 border border-cyan-500/50 px-3 py-1.5 rounded-xl text-xs font-semibold animate-pulse shadow-lg z-30">
                  {ptzNotice}
                </div>
              )}

              {/* RTMP Transmit Overlay */}
              {isMicTransmitting && (
                <div className="absolute inset-x-0 bottom-16 mx-auto w-11/12 bg-rose-950/90 border border-rose-500/80 rounded-2xl p-3 flex items-center justify-between text-white backdrop-blur-md shadow-2xl z-30">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center animate-pulse">
                      <Mic className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rose-200">ÁUDIO BIDIRECIONAL ATIVO</p>
                      <p className="text-[10px] text-rose-300">Transmitindo canal de áudio via RTMP</p>
                    </div>
                  </div>

                  {/* Level Bars */}
                  <div className="flex items-center space-x-1 h-5">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(4, (micAudioLevel * (i + 1)) / 10)}px` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Snapshot Success Notification */}
              {snapshotSuccess && (
                <div className="absolute bottom-16 left-4 bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs px-3 py-2 rounded-xl font-medium shadow-xl z-30">
                  ✓ Captura de tela gerada e salva no histórico!
                </div>
              )}
            </div>

            {/* Quick Stream Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center space-x-2 text-xs font-semibold"
                  title={isMuted ? 'Desmutar' : 'Mutar'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4" />}
                  <span>{isMuted ? 'Ativar Som' : 'Silenciar'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTakeSnapshot}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-md"
                >
                  <CameraIcon className="w-4 h-4" />
                  <span>Capturar Foto</span>
                </button>
              </div>
            </div>
          </div>

          {/* PTZ Controls & Camera Metadata */}
          <div className="space-y-4">
            {/* PTZ Keypad */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
              <p className="text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Controle PTZ (Pan/Tilt/Zoom)
              </p>

              <div className="inline-grid grid-cols-3 gap-1.5 p-2 bg-slate-900 rounded-2xl border border-slate-800">
                <div />
                <button
                  onClick={() => handlePtz('INCLINAR PARA CIMA')}
                  className="p-3 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-xl text-slate-300 transition"
                >
                  <ChevronUp className="w-5 h-5 mx-auto" />
                </button>
                <div />

                <button
                  onClick={() => handlePtz('GIRAR PARA ESQUERDA')}
                  className="p-3 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-xl text-slate-300 transition"
                >
                  <ChevronLeft className="w-5 h-5 mx-auto" />
                </button>
                <div className="p-3 bg-slate-950 rounded-xl text-[10px] text-slate-500 flex items-center justify-center font-mono">
                  PTZ
                </div>
                <button
                  onClick={() => handlePtz('GIRAR PARA DIREITA')}
                  className="p-3 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-xl text-slate-300 transition"
                >
                  <ChevronRight className="w-5 h-5 mx-auto" />
                </button>

                <div />
                <button
                  onClick={() => handlePtz('INCLINAR PARA BAIXO')}
                  className="p-3 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-xl text-slate-300 transition"
                >
                  <ChevronDown className="w-5 h-5 mx-auto" />
                </button>
                <div />
              </div>

              {/* Zoom controls */}
              <div className="flex items-center justify-center space-x-2 pt-1">
                <span className="text-[10px] text-slate-400 font-mono">Zoom: {zoomLevel}x</span>
                <button
                  onClick={() => handleZoom('in')}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleZoom('out')}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stream Specifications */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <p className="font-bold text-slate-300 border-b border-slate-800 pb-2">Especificações Técnicas</p>
              <div className="space-y-1.5 text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>URL Stream/RTSP:</span>
                  <span className="text-slate-200 truncate max-w-[180px]" title={camera.rtspUrl || camera.fullRtmpUrl || camera.rtmpUrl}>
                    {camera.rtspUrl || camera.fullRtmpUrl || camera.rtmpUrl || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Link RTMP/HTTP:</span>
                  <span className="text-cyan-300 truncate max-w-[180px]" title={camera.fullRtmpUrl || camera.rtmpUrl}>
                    {camera.fullRtmpUrl || camera.rtmpUrl || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Resolução:</span>
                  <span className="text-emerald-400 font-bold">{camera.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa de Quadros:</span>
                  <span className="text-slate-200">{camera.fps} FPS</span>
                </div>
                <div className="flex justify-between">
                  <span>Sensibilidade IA:</span>
                  <span className="text-slate-200">{camera.motionSensitivity}/10</span>
                </div>
                <div className="flex justify-between">
                  <span>Uso de Nuvem:</span>
                  <span className="text-cyan-400 font-bold">{camera.storageUsedGB} GB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
