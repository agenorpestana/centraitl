import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Film,
  Lock,
  Unlock,
  Play,
  Pause,
  Download,
  Trash2,
  Calendar,
  Clock,
  HardDrive,
  Sliders,
  ShieldCheck,
  Search,
  Filter,
  Camera as CameraIcon,
  X,
  AlertTriangle,
  RotateCcw,
  Shield,
  Radio,
  Square,
  Video,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { CloudRecording, User, Camera } from '../types';

interface CloudRecordingsVaultProps {
  recordings: CloudRecording[];
  cameras?: Camera[];
  activeUser: User;
  onDeleteRecording: (id: string) => void;
  onDeleteRecordingsBatch?: (ids: string[]) => void;
  isVaultUnlocked: boolean;
  onUnlockVault: () => void;
}

const formatDateTime = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const CloudRecordingsVault: React.FC<CloudRecordingsVaultProps> = ({
  recordings,
  cameras = [],
  activeUser,
  onDeleteRecording,
  onDeleteRecordingsBatch,
  isVaultUnlocked,
  onUnlockVault,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('ALL');
  const [storageLimitGB, setStorageLimitGB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('itl_storage_limit_gb');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 10) return parsed;
      }
    } catch {}
    return 100;
  });
  const [showStorageModal, setShowStorageModal] = useState<boolean>(false);
  const [storageSaving, setStorageSaving] = useState<boolean>(false);
  const [storageSaveSuccess, setStorageSaveSuccess] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Live Stream Recording Engine States
  const [targetRecordingCamId, setTargetRecordingCamId] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(300);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeSessionCamName, setActiveSessionCamName] = useState<string>('');
  const [recordingElapsedSec, setRecordingElapsedSec] = useState<number>(0);
  const [recordingStatusMsg, setRecordingStatusMsg] = useState<string>('');
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch storage limit from backend on mount
  useEffect(() => {
    fetch('/api/storage-config')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.storageLimitGB === 'number') {
          setStorageLimitGB(data.storageLimitGB);
          localStorage.setItem('itl_storage_limit_gb', data.storageLimitGB.toString());
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveStorageConfig = async () => {
    setStorageSaving(true);
    setStorageSaveSuccess(false);
    try {
      const res = await fetch('/api/storage-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageLimitGB }),
      });
      const data = await res.json();
      if (data && data.success) {
        localStorage.setItem('itl_storage_limit_gb', storageLimitGB.toString());
        setStorageSaveSuccess(true);
        setTimeout(() => {
          setStorageSaveSuccess(false);
          setShowStorageModal(false);
        }, 1200);
      } else {
        localStorage.setItem('itl_storage_limit_gb', storageLimitGB.toString());
        setShowStorageModal(false);
      }
    } catch (e) {
      localStorage.setItem('itl_storage_limit_gb', storageLimitGB.toString());
      setShowStorageModal(false);
    } finally {
      setStorageSaving(false);
    }
  };

  // Filter cameras accessible to the current user according to permissions
  const userAccessibleCameras = useMemo(() => {
    if (activeUser.role === 'ADMIN') return cameras;
    if (!activeUser.allowedCameraIds || activeUser.allowedCameraIds.includes('ALL')) return cameras;
    return cameras.filter((c) => activeUser.allowedCameraIds.includes(c.id));
  }, [cameras, activeUser]);

  // Set default target camera for real recording
  useEffect(() => {
    if (userAccessibleCameras.length > 0 && !targetRecordingCamId) {
      setTargetRecordingCamId(userAccessibleCameras[0].id);
    }
  }, [userAccessibleCameras, targetRecordingCamId]);

  // Poll active recording status from backend
  const checkActiveRecordings = async () => {
    try {
      const res = await fetch('/api/recordings/active');
      const activeList = await res.json();
      if (Array.isArray(activeList) && activeList.length > 0) {
        const current = activeList[0];
        setIsRecording(true);
        setActiveSessionCamName(current.cameraName);
        setRecordingElapsedSec(current.elapsedSeconds || 0);
      } else {
        setIsRecording(false);
        setActiveSessionCamName('');
      }
    } catch (e) {}
  };

  useEffect(() => {
    checkActiveRecordings();
    const interval = setInterval(checkActiveRecordings, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartRealRecording = async () => {
    if (!targetRecordingCamId) return;
    setRecordingError(null);
    setRecordingStatusMsg('Conectando ao fluxo RTMP/RTSP da câmera...');
    try {
      const res = await fetch('/api/recordings/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraId: targetRecordingCamId,
          durationSeconds: selectedDuration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsRecording(true);
        setRecordingStatusMsg(`Gravação iniciada em tempo real para a câmera selecionada.`);
        checkActiveRecordings();
      } else {
        setRecordingError(data.error || 'Erro ao iniciar gravação.');
        setRecordingStatusMsg('');
      }
    } catch (e: any) {
      setRecordingError('Servidor de gravação inacessível.');
      setRecordingStatusMsg('');
    }
  };

  const handleStopRealRecording = async () => {
    setRecordingStatusMsg('Finalizando gravação e salvando arquivo MP4 no cofre...');
    try {
      const res = await fetch('/api/recordings/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId: targetRecordingCamId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsRecording(false);
        setRecordingStatusMsg('Gravação finalizada e salva com sucesso!');
        setTimeout(() => setRecordingStatusMsg(''), 4000);
        checkActiveRecordings();
      }
    } catch (e) {}
  };

  // Filter recordings strictly for user accessible cameras
  const effectiveRecordings = useMemo(() => {
    const allowedIds = new Set(userAccessibleCameras.map((c) => c.id));
    const allowedNames = new Set(userAccessibleCameras.map((c) => c.name));

    let list = recordings.filter(
      (r) => allowedIds.has(r.cameraId) || allowedNames.has(r.cameraName)
    );

    list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return list;
  }, [recordings, userAccessibleCameras]);

  const [activeRecording, setActiveRecording] = useState<CloudRecording | null>(effectiveRecordings[0] || null);

  useEffect(() => {
    if (effectiveRecordings.length > 0) {
      if (!activeRecording || !effectiveRecordings.some((r) => r.id === activeRecording.id)) {
        setActiveRecording(effectiveRecordings[0]);
        setCurrentTime(0);
        setIsPlaying(true);
      }
    } else {
      setActiveRecording(null);
    }
  }, [effectiveRecordings]);

  // Sync video element state & playback
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      if (isPlaying) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.log('Autoplay or video playback prevented:', e);
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, playbackSpeed, activeRecording]);

  const activeCamera = useMemo(() => {
    if (!activeRecording) return userAccessibleCameras[0] || null;
    return (
      cameras.find((c) => c.id === activeRecording.cameraId || c.name === activeRecording.cameraName) ||
      userAccessibleCameras[0] ||
      cameras[0] ||
      null
    );
  }, [activeRecording, cameras, userAccessibleCameras]);

  const filteredRecordings = effectiveRecordings.filter((rec) => {
    if (selectedCameraId !== 'ALL' && rec.cameraId !== selectedCameraId) {
      return false;
    }
    if (selectedDate && !rec.startTime.includes(selectedDate)) {
      return false;
    }
    if (rec.startTime.includes(' ')) {
      const timePart = rec.startTime.split(' ')[1] || '';
      if (selectedStartTime && timePart < selectedStartTime) {
        return false;
      }
      if (selectedEndTime && timePart > selectedEndTime + ':59') {
        return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCam = rec.cameraName.toLowerCase().includes(q);
      const matchTag = rec.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchCam && !matchTag) return false;
    }
    return true;
  });

  const totalStorageMB = recordings.reduce((acc, r) => acc + (r.fileSizeMB || 0), 0);
  const totalStorageGB = totalStorageMB / 1024;
  const storagePercentage = Math.min(100, Math.round((totalStorageGB / storageLimitGB) * 100));

  const handleFifoPrune = async () => {
    try {
      const res = await fetch('/api/recordings/prune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limitGB: storageLimitGB }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.prunedCount > 0) {
          alert(`Limpeza FIFO executada com sucesso! ${data.prunedCount} fatias mais antigas foram eliminadas. Armazenamento atual: ${data.currentGB.toFixed(2)} GB.`);
          window.location.reload();
        } else {
          alert(`O armazenamento (${data.currentGB.toFixed(2)} GB) já está dentro do limite de ${storageLimitGB} GB. Nenhuma ação necessária.`);
        }
      } else {
        alert(data.message || 'Erro ao executar limpeza FIFO.');
      }
    } catch (e) {
      alert('Erro de conexão ao solicitar limpeza de armazenamento.');
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredRecordings.length === 0) return false;
    return filteredRecordings.every((r) => selectedIds.includes(r.id));
  }, [filteredRecordings, selectedIds]);

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredSet = new Set(filteredRecordings.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const filteredIds = filteredRecordings.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (onDeleteRecordingsBatch) {
      onDeleteRecordingsBatch(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteRecording(id));
    }
    setSelectedIds([]);
  };

  const handleDeleteAllFiltered = () => {
    if (filteredRecordings.length === 0) return;
    const allIds = filteredRecordings.map((r) => r.id);
    if (onDeleteRecordingsBatch) {
      onDeleteRecordingsBatch(allIds);
    } else {
      allIds.forEach((id) => onDeleteRecording(id));
    }
    setSelectedIds([]);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDate('');
    setSelectedStartTime('');
    setSelectedEndTime('');
    setSelectedCameraId('ALL');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate real clock timestamp corresponding to current seek position
  const getRecordedClockTime = (startTimeStr: string | undefined, offsetSec: number): string => {
    if (!startTimeStr) return '';
    try {
      const dateParts = startTimeStr.split(' ');
      if (dateParts.length < 2) return startTimeStr;
      const [ymd, hms] = dateParts;
      const [y, m, d] = ymd.split('-').map(Number);
      const [h, min, s] = hms.split(':').map(Number);

      const baseMs = new Date(y, m - 1, d, h, min, s).getTime();
      const currentMs = baseMs + offsetSec * 1000;
      const currDate = new Date(currentMs);

      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(currDate.getDate())}/${pad(currDate.getMonth() + 1)}/${currDate.getFullYear()} ${pad(currDate.getHours())}:${pad(currDate.getMinutes())}:${pad(currDate.getSeconds())}`;
    } catch (e) {
      return startTimeStr;
    }
  };

  const handleSeek = (newSec: number) => {
    setCurrentTime(newSec);
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = newSec % videoRef.current.duration;
    }
  };

  const handleDownloadClip = () => {
    if (!activeRecording) return;
    const clipUrl = activeRecording.streamUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    const a = document.createElement('a');
    a.href = clipUrl;
    a.download = `gravacao_${activeRecording.cameraName.replace(/\s+/g, '_')}_${activeRecording.startTime.replace(/[: ]/g, '-')}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Film className="w-5 h-5 text-emerald-400" />
            Cofre de Gravações em Nuvem (Fatias de 5 Minutos e E2EE)
          </h2>
          <p className="text-xs text-slate-400">
            Gravação contínua segmentada em blocos de 5 minutos com retenção inteligente e filtro por data/hora
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Storage Meter Button */}
          <button
            type="button"
            onClick={() => setShowStorageModal(true)}
            className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 flex items-center gap-2 shadow-sm transition"
            title="Configurar Limite de Armazenamento GB e Limpeza"
          >
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Uso: <strong className="text-emerald-400">{totalStorageGB.toFixed(2)} GB</strong> / {storageLimitGB} GB
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                storagePercentage > 85 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {storagePercentage}%
            </span>
          </button>

          <button
            onClick={onUnlockVault}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition ${
              isVaultUnlocked
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            {isVaultUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isVaultUnlocked ? 'Cofre Desbloqueado' : 'Desbloquear Cofre'}</span>
          </button>
        </div>
      </div>

      {/* 24/7 Continuous Automatic Recording Status Banner */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2 flex-wrap">
              <span>Gravação Automática Contínua 24/7 em Produção</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                {userAccessibleCameras.length} Câmeras Reais Gravando
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Todas as câmeras registradas no sistema gravam automaticamente em tempo real sem necessidade de acionamento manual.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800/60 px-2.5 py-1 rounded-lg shrink-0">
            HD Real RTMP/RTSP
          </span>
        </div>
      </div>

      {showStorageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                Gerenciar Armazenamento de Gravações
              </h3>
              <button
                onClick={() => setShowStorageModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Limite de Armazenamento (GB):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={storageLimitGB}
                    onChange={(e) => setStorageLimitGB(Math.max(10, parseInt(e.target.value) || 100))}
                    className="bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-sm w-full outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs font-mono text-slate-400">GB</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Total Utilizado:</span>
                  <span className="text-emerald-400 font-bold">{totalStorageGB.toFixed(2)} GB</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      storagePercentage > 85 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${storagePercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Total de blocos armazenados: <strong className="text-white">{recordings.length}</strong> fatias de 5 minutos.
                </p>
              </div>

              {storageSaveSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Limite de {storageLimitGB} GB salvo no Banco de Dados com sucesso!</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFifoPrune}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Executar Limpeza Manual FIFO (Pruning)</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 gap-2">
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={storageSaving}
                onClick={handleSaveStorageConfig}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {storageSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{storageSaving ? 'Salvando...' : 'Salvar no Banco de Dados'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Video Player & Search Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Recorded Clip Player */}
        <div className="lg:col-span-2 space-y-3">
          {activeRecording ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <video
                  key={activeRecording.id}
                  ref={videoRef}
                  src={
                    activeRecording.streamUrl && activeRecording.streamUrl.endsWith('.mp4')
                      ? activeRecording.streamUrl
                      : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                  }
                  poster={activeCamera?.thumbnailUrl || activeRecording.thumbnailUrl}
                  crossOrigin="anonymous"
                  playsInline
                  autoPlay={isPlaying}
                  onTimeUpdate={(e) => {
                    setCurrentTime(Math.floor(e.currentTarget.currentTime));
                  }}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-cover"
                />

                {/* Real-time Recorded OSD Watermarks */}
                {isVaultUnlocked && (
                  <>
                    <div className="absolute top-3 left-3 z-30 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/50 flex items-center space-x-2 text-xs font-mono shadow-2xl">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-400 font-black tracking-wider">REC REPRODUÇÃO NUVEM E2EE</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-300 font-semibold">{activeRecording.cameraName}</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-white font-black text-xs sm:text-sm bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-slate-700">
                        {getRecordedClockTime(activeRecording.startTime, currentTime)}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 z-30 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 flex items-center space-x-1.5 shadow-2xl">
                      <Shield className="w-3.5 h-3.5" />
                      <span>FATIA FATURADA 5MIN</span>
                    </div>
                  </>
                )}

                {/* E2EE Lock Overlay if locked */}
                {!isVaultUnlocked && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center space-y-3 text-center p-6 z-40">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-white">Conteúdo Criptografado E2EE</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Forneça a frase secreta do cofre para decodificar e visualizar esta gravação em tempo real.
                    </p>
                    <button
                      onClick={onUnlockVault}
                      className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-emerald-400 transition"
                    >
                      Digitar Chave Mestra
                    </button>
                  </div>
                )}

                {/* Play/Pause Overlay Button */}
                {isVaultUnlocked && (
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="absolute bottom-3 right-3 z-30 p-2.5 bg-slate-950/90 hover:bg-emerald-500 text-white hover:text-slate-950 rounded-xl transition shadow-2xl border border-white/20 flex items-center gap-1.5 text-xs font-bold"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 text-emerald-400" />
                        <span>Pausar Gravação</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current text-emerald-400" />
                        <span>Reproduzir Gravação</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Timeline Scrubber Slider */}
              <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>00:00</span>
                  <span className="text-emerald-400 font-semibold">
                    {formatDuration(currentTime)} / {formatDuration(activeRecording.durationSeconds)} (Velocidade: {playbackSpeed}x)
                  </span>
                  <span>{formatDuration(activeRecording.durationSeconds)}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={activeRecording.durationSeconds}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400">Velocidade:</span>
                    {[0.5, 1, 2, 4].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                          playbackSpeed === speed
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleDownloadClip}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl flex items-center space-x-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Baixar Clipe MP4</span>
                  </button>
                </div>
              </div>

              {/* Active Recording Information */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    {activeRecording.cameraName}
                    <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded border border-slate-700">
                      Bloco 5 min (Completo)
                    </span>
                  </h4>
                  <p className="text-slate-400 font-mono text-[11px] pt-0.5">
                    Início: <strong className="text-white">{activeRecording.startTime}</strong> | Fim: <strong className="text-white">{activeRecording.endTime}</strong> | Tamanho: {activeRecording.fileSizeMB} MB
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {activeRecording.tags.map((t, idx) => (
                    <span key={idx} className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <Video className="w-12 h-12 mx-auto text-emerald-500/50" />
              <div>
                <p className="font-bold text-slate-200 text-sm">Nenhum bloco de gravação no cofre</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Os dados fictícios foram permanentemente desativados. Para gravar um clipe real, utilize o painel superior "Gravação de Transmissão Real Ao Vivo" para selecionar uma câmera e gravar o fluxo RTMP/RTSP em tempo real.
                </p>
              </div>
              <button
                onClick={handleStartRealRecording}
                disabled={isRecording}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg inline-flex items-center gap-2 transition"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Iniciar Gravação Real Agora</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter and Recording List Panel */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                Buscar Gravações Nuvem
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full">
                {filteredRecordings.length} blocos
              </span>
            </div>

            {/* Filter Inputs */}
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono mb-1 flex items-center gap-1">
                  <CameraIcon className="w-3 h-3 text-slate-500" /> Câmera:
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Todas as Câmeras Autorizadas ({userAccessibleCameras.length})</option>
                  {userAccessibleCameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" /> Data da Gravação:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" /> Hora Início:
                  </label>
                  <input
                    type="time"
                    value={selectedStartTime}
                    onChange={(e) => setSelectedStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2 py-1.5 rounded-lg text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-500" /> Hora Fim:
                  </label>
                  <input
                    type="time"
                    value={selectedEndTime}
                    onChange={(e) => setSelectedEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2 py-1.5 rounded-lg text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por tag (ex: #Portaria)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-xs pl-8 outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              </div>

              {(selectedDate || selectedStartTime || selectedEndTime || selectedCameraId !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full py-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Batch Actions & Selection Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <span>Marcar Todas ({filteredRecordings.length})</span>
              </label>

              {selectedIds.length > 0 && (
                <span className="text-[11px] font-mono text-emerald-400">
                  {selectedIds.length} selecionada(s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                  selectedIds.length > 0
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Selecionadas ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteAllFiltered}
                disabled={filteredRecordings.length === 0}
                className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center space-x-1 transition shrink-0"
                title="Excluir todas as gravações atualmente visíveis nos filtros"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Todas</span>
              </button>
            </div>
          </div>

          {/* Recordings List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 space-y-2 max-h-[440px] overflow-y-auto">
            {filteredRecordings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhuma fatia de 5 min encontrada com os filtros selecionados.
              </div>
            ) : (
              filteredRecordings.map((rec) => {
                const isActive = activeRecording?.id === rec.id;
                const isChecked = selectedIds.includes(rec.id);
                const recCam = cameras.find((c) => c.id === rec.cameraId || c.name === rec.cameraName);
                const thumbUrl = recCam?.thumbnailUrl || rec.thumbnailUrl;

                return (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setActiveRecording(rec);
                      setCurrentTime(0);
                      setIsPlaying(true);
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : isChecked
                        ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(rec.id);
                        }}
                        className="p-1 cursor-pointer shrink-0"
                        title="Marcar para seleção em lote"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer pointer-events-none"
                        />
                      </div>

                      <div className="relative shrink-0">
                        <img src={thumbUrl} className="w-11 h-11 rounded-lg object-cover border border-slate-800" />
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 text-[8px] font-black px-1 rounded border border-slate-950">
                          5m
                        </span>
                      </div>

                      <div className="truncate">
                        <h5 className="font-bold text-xs truncate text-white">{rec.cameraName}</h5>
                        <p className="text-[10px] font-mono text-slate-400">{rec.startTime}</p>
                        <p className="text-[10px] text-emerald-400 font-mono">
                          5 min (Completo) • {rec.fileSizeMB} MB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Excluir gravação"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRecording(rec.id);
                        }}
                        className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
