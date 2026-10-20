import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Film,
  Lock,
  Play,
  Pause,
  Download,
  Trash2,
  Calendar,
  Clock,
  HardDrive,
  Search,
  Filter,
  Camera as CameraIcon,
  X,
  RotateCcw,
  Radio,
  Video,
  CheckCircle2,
  RefreshCw,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Grid,
  List,
  Layers,
  Sliders,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import { CloudRecording, User, Camera } from '../types';

interface CloudRecordingsVaultProps {
  recordings: CloudRecording[];
  cameras?: Camera[];
  activeUser: User;
  onDeleteRecording: (id: string) => void;
  onDeleteRecordingsBatch?: (ids: string[]) => void;
  onDeleteAllRecordings?: (options?: { ids?: string[]; date?: string; cameraId?: string }) => void;
  isVaultUnlocked: boolean;
  onUnlockVault: () => void;
}

interface AvailableDateInfo {
  date: string;
  count: number;
  cameras: string[];
}

interface TimelineSegment {
  id: string;
  cameraId: string;
  cameraName: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  fileSizeMB: number;
  startSec: number;
  endSec: number;
  type: 'continuous' | 'motion' | 'ai';
  streamUrl: string;
  thumbnailUrl: string;
}

const getTodayYMD = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getDefaultTimeWindow = () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const endH = now.getHours();
  const endM = now.getMinutes();
  const startH = Math.max(0, endH - 2);
  return {
    start: `${pad(startH)}:00`,
    end: `${pad(endH)}:${pad(endM)}`,
  };
};

export const CloudRecordingsVault: React.FC<CloudRecordingsVaultProps> = ({
  recordings,
  cameras = [],
  activeUser,
  onDeleteRecording,
  onDeleteRecordingsBatch,
  onDeleteAllRecordings,
  isVaultUnlocked,
  onUnlockVault,
}) => {
  // DVR Search Parameters - Inicialização otimizada sob demanda para evitar carregar o dia todo de uma vez
  const initialTime = useMemo(() => getDefaultTimeWindow(), []);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(() => {
    return cameras && cameras.length > 0 ? cameras[0].id : 'ALL';
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayYMD());
  const [selectedStartTime, setSelectedStartTime] = useState<string>(initialTime.start);
  const [selectedEndTime, setSelectedEndTime] = useState<string>(initialTime.end);
  const [selectedEventType, setSelectedEventType] = useState<'all' | 'continuous' | 'motion' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View state: Grid or List Table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Search Results & Loading
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<CloudRecording[] | null>(null);
  const [availableDates, setAvailableDates] = useState<AvailableDateInfo[]>([]);
  const [searchCountMessage, setSearchCountMessage] = useState<string>('');

  // Timeline Segments (0 to 86400s)
  const [timelineSegments, setTimelineSegments] = useState<TimelineSegment[]>([]);
  const [timelineHoverSec, setTimelineHoverSec] = useState<number | null>(null);
  const [timelineHoverPos, setTimelineHoverPos] = useState<number>(0);
  const timelineBarRef = useRef<HTMLDivElement>(null);

  // Video Player States
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerBoxRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Storage / FIFO management
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

  // Disk maintenance & notifications
  const [isScanningDisk, setIsScanningDisk] = useState<boolean>(false);
  const [isRepairingAll, setIsRepairingAll] = useState<boolean>(false);
  const [repairNotice, setRepairNotice] = useState<string>('');

  // Live Stream Recording Engine States (Manual Recording)
  const [targetRecordingCamId, setTargetRecordingCamId] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(300);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeSessionCamName, setActiveSessionCamName] = useState<string>('');
  const [recordingElapsedSec, setRecordingElapsedSec] = useState<number>(0);
  const [recordingStatusMsg, setRecordingStatusMsg] = useState<string>('');
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Permissions: Viewers and Residents cannot delete recordings
  const canDeleteRecordings = activeUser
    ? activeUser.role !== 'VIEWER' &&
      activeUser.role !== 'RESIDENT' &&
      Boolean(activeUser.role === 'ADMIN' || activeUser.customPermissions?.canDeleteRecordings)
    : false;

  // Filter accessible cameras for current user
  const userAccessibleCameras = useMemo(() => {
    if (!cameras || cameras.length === 0) return [];
    if (activeUser.role === 'ADMIN') return cameras;
    const allowed = activeUser.allowedCameraIds || ['ALL'];
    if (allowed.includes('ALL')) return cameras;
    return cameras.filter((c) => {
      const cleanId = c.id.replace(/^cam[-_]/i, '');
      return allowed.some((aId) => aId === c.id || aId.replace(/^cam[-_]/i, '') === cleanId);
    });
  }, [cameras, activeUser]);

  // Load available dates with recordings from backend
  const fetchAvailableDates = async () => {
    try {
      const res = await fetch('/api/recordings/dates', {
        headers: { 'x-user-id': activeUser.id, 'x-user-email': activeUser.email },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAvailableDates(data);
          // Se a data atual selecionada não tem gravações mas existem datas disponíveis gravadas, pré-selecionar a mais recente
          if (data.length > 0) {
            const hasToday = data.some((d) => d.date === getTodayYMD());
            if (!hasToday && selectedDate === getTodayYMD()) {
              const newestDate = data[0].date;
              setSelectedDate(newestDate);
              executeDvrSearch({ dt: newestDate });
              fetchTimelineData(selectedCameraId, newestDate);
            }
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAvailableDates();
  }, [activeUser.id]);

  // Load storage limit from backend
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

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!playerBoxRef.current) return;
    if (!document.fullscreenElement) {
      playerBoxRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // DVR Quick Presets (Última hora, 2 horas, turnos)
  const applyPresetTime = (start: string, end: string) => {
    setSelectedStartTime(start);
    setSelectedEndTime(end);
    executeDvrSearch({ startT: start, endT: end });
  };

  const applyLast1Hour = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const endH = now.getHours();
    const endM = now.getMinutes();
    const startH = Math.max(0, endH - 1);
    applyPresetTime(`${pad(startH)}:00`, `${pad(endH)}:${pad(endM)}`);
  };

  const applyLast2Hours = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const endH = now.getHours();
    const endM = now.getMinutes();
    const startH = Math.max(0, endH - 2);
    applyPresetTime(`${pad(startH)}:00`, `${pad(endH)}:${pad(endM)}`);
  };

  // Execute targeted DVR search on backend
  const executeDvrSearch = async (overrideParams?: {
    camId?: string;
    dt?: string;
    startT?: string;
    endT?: string;
    evtType?: string;
  }) => {
    setIsSearching(true);
    setSearchCountMessage('');
    try {
      const targetCam = overrideParams?.camId !== undefined ? overrideParams.camId : selectedCameraId;
      const targetDt = overrideParams?.dt !== undefined ? overrideParams.dt : selectedDate;
      const targetStart = overrideParams?.startT !== undefined ? overrideParams.startT : selectedStartTime;
      const targetEnd = overrideParams?.endT !== undefined ? overrideParams.endT : selectedEndTime;
      const targetType = overrideParams?.evtType !== undefined ? overrideParams.evtType : selectedEventType;

      const params = new URLSearchParams();
      if (targetCam && targetCam !== 'ALL') params.set('cameraId', targetCam);
      if (targetDt && targetDt !== 'ALL') params.set('date', targetDt);
      if (targetStart) params.set('startTime', targetStart);
      if (targetEnd) params.set('endTime', targetEnd);
      if (targetType && targetType !== 'all') params.set('type', targetType);
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', '300');
      params.set('reconcile', '1');

      const res = await fetch(`/api/recordings?${params.toString()}`, {
        headers: { 'x-user-id': activeUser.id, 'x-user-email': activeUser.email },
      });

      if (res.ok) {
        const data = await res.json();
        const list: CloudRecording[] = Array.isArray(data) ? data : Array.isArray(data.recordings) ? data.recordings : [];
        setSearchResults(list);
        setSearchCountMessage(`${list.length} gravação(ões) encontrada(s) no gravador.`);

        // Se o clipe ativo não estiver na lista retornada, selecionar o primeiro resultado
        if (list.length > 0) {
          setActiveRecording((prev) => {
            if (!prev) return list[0];
            const exists = list.some((r) => r.id === prev.id);
            return exists ? prev : list[0];
          });
        }
      }
    } catch (e: any) {
      console.error('[DVR Search Error]:', e);
      setSearchCountMessage('Falha ao consultar gravador.');
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch timeline segments for 24h bar
  const fetchTimelineData = async (camId: string, dt: string) => {
    if (!dt || dt === 'ALL') {
      setTimelineSegments([]);
      return;
    }
    try {
      const params = new URLSearchParams({
        cameraId: camId || 'ALL',
        date: dt,
      });
      const res = await fetch(`/api/recordings/timeline?${params.toString()}`, {
        headers: { 'x-user-id': activeUser.id, 'x-user-email': activeUser.email },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.segments)) {
          setTimelineSegments(data.segments);
        }
      }
    } catch (e) {}
  };

  // Trigger search on mount and when key DVR parameters change
  useEffect(() => {
    executeDvrSearch();
    fetchTimelineData(selectedCameraId, selectedDate);
  }, [selectedCameraId, selectedDate, activeUser.id]);

  // Recordings to display: search results if queried, or effective fallback from props
  const effectiveRecordings = useMemo(() => {
    if (searchResults !== null) {
      return searchResults;
    }

    // Fallback: filter recordings from props
    let list = [...recordings];
    if (activeUser.role !== 'ADMIN') {
      const allowedIds = new Set(userAccessibleCameras.map((c) => c.id));
      const allowedClean = new Set(userAccessibleCameras.map((c) => c.id.replace(/^cam[-_]/i, '')));
      list = list.filter((r) => allowedIds.has(r.cameraId) || allowedClean.has((r.cameraId || '').replace(/^cam[-_]/i, '')));
    }

    if (selectedCameraId !== 'ALL') {
      const cleanReq = selectedCameraId.replace(/^cam[-_]/i, '').toLowerCase();
      const targetCam = cameras.find((c) => c.id === selectedCameraId || c.id.replace(/^cam[-_]/i, '').toLowerCase() === cleanReq);
      const targetName = targetCam ? targetCam.name.toLowerCase() : '';
      list = list.filter((r) => {
        const cleanRec = (r.cameraId || '').replace(/^cam[-_]/i, '').toLowerCase();
        if (r.cameraId === selectedCameraId || cleanRec === cleanReq) return true;
        if (targetName && r.cameraName && r.cameraName.toLowerCase().includes(targetName)) return true;
        return false;
      });
    }
    if (selectedDate && selectedDate !== 'ALL') {
      let cleanDate = selectedDate;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanDate)) {
        cleanDate = cleanDate.split('/').reverse().join('-');
      }
      list = list.filter((r) => r.startTime && (r.startTime.includes(cleanDate) || r.startTime.split(' ')[0] === cleanDate));
    }
    if (selectedStartTime || selectedEndTime) {
      list = list.filter((r) => {
        if (!r.startTime || !r.startTime.includes(' ')) return true;
        const timePart = r.startTime.split(' ')[1] || '';
        if (selectedStartTime && timePart < selectedStartTime) return false;
        if (selectedEndTime && timePart > `${selectedEndTime}:59`) return false;
        return true;
      });
    }

    list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return list;
  }, [searchResults, recordings, selectedCameraId, selectedDate, selectedStartTime, selectedEndTime, activeUser, userAccessibleCameras]);

  const [activeRecording, setActiveRecording] = useState<CloudRecording | null>(effectiveRecordings[0] || null);

  useEffect(() => {
    if (effectiveRecordings.length > 0) {
      setActiveRecording((prev) => {
        if (!prev) return effectiveRecordings[0];
        const exists = effectiveRecordings.find((r) => r.id === prev.id);
        return exists ? prev : effectiveRecordings[0];
      });
    } else {
      setActiveRecording(null);
    }
  }, [effectiveRecordings]);

  // Video playback synchronization
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
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

  // Disk scan handler
  const handleScanDisk = async () => {
    setIsScanningDisk(true);
    setRepairNotice('Varrendo diretório de gravações e sincronizando arquivos...');
    try {
      const res = await fetch('/api/recordings/scan', { method: 'POST' });
      const data = await res.json();
      if (data.message) {
        setRepairNotice(data.message);
        setTimeout(() => setRepairNotice(''), 4000);
      }
      await fetchAvailableDates();
      await executeDvrSearch();
      await fetchTimelineData(selectedCameraId, selectedDate);
    } catch (e) {
      setRepairNotice('Erro ao varrer o disco.');
      setTimeout(() => setRepairNotice(''), 3000);
    } finally {
      setIsScanningDisk(false);
    }
  };

  // Repair all MP4s
  const handleRepairAll = async () => {
    setIsRepairingAll(true);
    setRepairNotice('Otimizando cabeçalhos e índices MP4 no servidor...');
    try {
      const res = await fetch('/api/recordings/repair-all', { method: 'POST' });
      const data = await res.json();
      if (data.message) {
        setRepairNotice(data.message);
        setTimeout(() => setRepairNotice(''), 4000);
      }
      await executeDvrSearch();
    } catch (e) {
      setRepairNotice('Erro ao reparar arquivos.');
      setTimeout(() => setRepairNotice(''), 3000);
    } finally {
      setIsRepairingAll(false);
    }
  };

  // Storage Limit Save
  const handleSaveStorageConfig = async () => {
    setStorageSaving(true);
    setStorageSaveSuccess(false);
    try {
      const res = await fetch('/api/storage-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageLimitGB }),
      });
      if (res.ok) {
        setStorageSaveSuccess(true);
        localStorage.setItem('itl_storage_limit_gb', storageLimitGB.toString());
        setTimeout(() => {
          setShowStorageModal(false);
          setStorageSaveSuccess(false);
        }, 1500);
      }
    } catch (e) {} finally {
      setStorageSaving(false);
    }
  };

  // Storage calculations
  const totalStorageGB = useMemo(() => {
    return effectiveRecordings.reduce((acc, curr) => acc + (curr.fileSizeMB || 0), 0) / 1024;
  }, [effectiveRecordings]);

  const storagePercentage = Math.min(100, Math.round((totalStorageGB / storageLimitGB) * 100));

  // Selection handlers
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === effectiveRecordings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(effectiveRecordings.map((r) => r.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!canDeleteRecordings) {
      alert('Usuários com perfil Visualizador ou Vizinho não possuem permissão para excluir gravações.');
      return;
    }
    if (selectedIds.length === 0) return;
    if (!confirm(`Deseja realmente excluir permanentemente as ${selectedIds.length} gravações selecionadas?`)) {
      return;
    }
    const idsToDelete = [...selectedIds];
    setSelectedIds([]);
    if (activeRecording && idsToDelete.includes(activeRecording.id)) {
      setActiveRecording(null);
      setIsPlaying(false);
    }
    if (onDeleteRecordingsBatch) {
      onDeleteRecordingsBatch(idsToDelete);
    } else {
      idsToDelete.forEach((id) => onDeleteRecording(id));
    }
    setTimeout(() => {
      executeDvrSearch();
      fetchTimelineData(selectedCameraId, selectedDate);
    }, 500);
  };

  const handleDeleteAllFiltered = async () => {
    if (!canDeleteRecordings) {
      alert('Usuários com perfil Visualizador ou Vizinho não possuem permissão para excluir gravações.');
      return;
    }
    if (effectiveRecordings.length === 0) return;
    const filterContext = selectedDate ? `do dia ${selectedDate.split('-').reverse().join('/')}` : 'filtradas';
    if (!confirm(`Deseja realmente excluir permanentemente todas as ${effectiveRecordings.length} gravações ${filterContext}?`)) {
      return;
    }
    const idsToDelete = effectiveRecordings.map((r) => r.id);
    setSelectedIds([]);
    setActiveRecording(null);
    setIsPlaying(false);

    if (onDeleteAllRecordings) {
      onDeleteAllRecordings({ ids: idsToDelete, date: selectedDate, cameraId: selectedCameraId });
    } else if (onDeleteRecordingsBatch) {
      onDeleteRecordingsBatch(idsToDelete);
    } else {
      idsToDelete.forEach((id) => onDeleteRecording(id));
    }
    setTimeout(() => {
      executeDvrSearch();
      fetchTimelineData(selectedCameraId, selectedDate);
    }, 500);
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert seconds from 00:00:00 to HH:mm
  const formatSecondsToClock = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Timeline click handler: clicking any time jumps to that recording
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineBarRef.current) return;
    const rect = timelineBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = clickX / rect.width;
    const clickedSec = Math.floor(percent * 86400);

    // Encontrar segmento que cobre este segundo
    const matchingSeg = timelineSegments.find((s) => clickedSec >= s.startSec && clickedSec <= s.endSec);
    if (matchingSeg) {
      const fullRec = effectiveRecordings.find((r) => r.id === matchingSeg.id);
      if (fullRec) {
        setActiveRecording(fullRec);
        const offset = Math.max(0, clickedSec - matchingSeg.startSec);
        handleSeek(offset);
        setIsPlaying(true);
        return;
      }
    }

    // Se clicou fora de um segmento, encontrar o segmento mais próximo posterior
    const nextSeg = timelineSegments.find((s) => s.startSec >= clickedSec);
    if (nextSeg) {
      const fullRec = effectiveRecordings.find((r) => r.id === nextSeg.id);
      if (fullRec) {
        setActiveRecording(fullRec);
        handleSeek(0);
        setIsPlaying(true);
      }
    }
  };

  // Calculate current playback second in the 24h day for the red playhead
  const currentPlaybackDaySec = useMemo(() => {
    if (!activeRecording || !activeRecording.startTime || !activeRecording.startTime.includes(' ')) {
      return null;
    }
    try {
      const timeParts = activeRecording.startTime.split(' ')[1].split(':').map(Number);
      const baseSec = (timeParts[0] || 0) * 3600 + (timeParts[1] || 0) * 60 + (timeParts[2] || 0);
      return Math.min(86400, baseSec + currentTime);
    } catch (e) {
      return null;
    }
  }, [activeRecording, currentTime]);

  // Real-time clock timestamp for active playback
  const currentPlaybackClock = useMemo(() => {
    if (!activeRecording || !activeRecording.startTime) return '';
    try {
      const parts = activeRecording.startTime.split(' ');
      if (parts.length < 2) return activeRecording.startTime;
      const [ymd, hms] = parts;
      const [y, m, d] = ymd.split('-').map(Number);
      const [h, min, s] = hms.split(':').map(Number);
      const dateObj = new Date(y, m - 1, d, h, min, s);
      dateObj.setSeconds(dateObj.getSeconds() + currentTime);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
    } catch (e) {
      return activeRecording.startTime;
    }
  }, [activeRecording, currentTime]);

  return (
    <div className="space-y-6">
      {/* Top Header & DVR System Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Central de Gravações em Nuvem (DVR / NVR)
              </h2>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full font-mono border border-emerald-500/30 font-bold uppercase">
                Sistema Operacional 24/7
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Busca sob demanda por Câmera, Data e Horário com Linha do Tempo contínua e reprodução multi-velocidade.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {repairNotice && (
            <span className="text-xs font-mono text-amber-300 bg-amber-950/80 border border-amber-800 px-3 py-1.5 rounded-xl animate-fade-in flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{repairNotice}</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleScanDisk}
            disabled={isScanningDisk}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 rounded-xl transition disabled:opacity-50 shadow-sm"
            title="Varrer pasta /recordings no servidor para sincronizar novos blocos de vídeo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningDisk ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{isScanningDisk ? 'Varrendo Disco...' : 'Sincronizar Disco'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStorageModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 rounded-xl transition shadow-sm"
            title="Configurar limites de retenção de armazenamento FIFO"
          >
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Armazenamento: {totalStorageGB.toFixed(1)} GB / {storageLimitGB} GB</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE BUSCA AVANÇADA DO DVR (Estilo NVR / Gravador Profissional) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Painel de Pesquisa e Filtros DVR
            </h3>
            <span className="text-[11px] text-slate-400 font-normal">
              (Selecione os parâmetros e busque apenas as imagens necessárias)
            </span>
          </div>

          {searchCountMessage && (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg">
              {searchCountMessage}
            </span>
          )}
        </div>

        {/* Linha de Filtros Principais do DVR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Seleção de Câmera */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <CameraIcon className="w-3.5 h-3.5 text-emerald-400" /> Câmera Alvo:
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2.5 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium"
            >
              <option value="ALL">Todas as Câmeras ({userAccessibleCameras.length})</option>
              {userAccessibleCameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.location || 'Local'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Seleção de Data */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Data da Gravação:
            </label>
            <input
              type="date"
              value={selectedDate === 'ALL' ? '' : selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* 3. Faixa de Horário (Início - Fim) */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Faixa de Horário:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={selectedStartTime}
                onChange={(e) => setSelectedStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-2.5 py-2 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                title="Horário Inicial de Busca"
              />
              <span className="text-slate-500 font-bold text-xs">até</span>
              <input
                type="time"
                value={selectedEndTime}
                onChange={(e) => setSelectedEndTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-2.5 py-2 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                title="Horário Final de Busca"
              />
            </div>
          </div>

          {/* 4. Tipo de Registro */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-400" /> Tipo de Evento:
            </label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2.5 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium"
            >
              <option value="all">Todos os Registros</option>
              <option value="continuous">Gravação Contínua (24h)</option>
              <option value="motion">Detecção de Movimento</option>
              <option value="ai">Alertas Inteligentes (IA)</option>
            </select>
          </div>
        </div>

        {/* Atalhos Rápidos de Horário estilo DVR Profissional (Reduz buscas desnecessárias) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          {/* Chips de Intervalos Rápidos */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] text-slate-400 font-bold mr-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> Atalhos Rápidos:
            </span>
            <button
              type="button"
              onClick={applyLast1Hour}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/60 transition"
              title="Buscar gravações da última 1 hora"
            >
              ⚡ Última 1 hora
            </button>
            <button
              type="button"
              onClick={applyLast2Hours}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/60 transition"
              title="Buscar gravações das últimas 2 horas"
            >
              ⚡ Últimas 2 horas
            </button>
            <button
              type="button"
              onClick={() => applyPresetTime('06:00', '12:00')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedStartTime === '06:00' && selectedEndTime === '12:00'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Manhã (06h - 12h)
            </button>
            <button
              type="button"
              onClick={() => applyPresetTime('12:00', '18:00')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedStartTime === '12:00' && selectedEndTime === '18:00'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Tarde (12h - 18h)
            </button>
            <button
              type="button"
              onClick={() => applyPresetTime('18:00', '23:59')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedStartTime === '18:00' && selectedEndTime === '23:59'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Noite (18h - 24h)
            </button>
            <button
              type="button"
              onClick={() => applyPresetTime('00:00', '06:00')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedStartTime === '00:00' && selectedEndTime === '06:00'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Madrugada (00h - 06h)
            </button>
            <button
              type="button"
              onClick={() => applyPresetTime('00:00', '23:59')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedStartTime === '00:00' && selectedEndTime === '23:59'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
              title="Buscar todo o período de 24 horas"
            >
              Dia Todo (24h)
            </button>
          </div>

          {/* Botão Principal de Busca do DVR */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => executeDvrSearch()}
              disabled={isSearching}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'Pesquisando DVR...' : 'BUSCAR NO GRAVADOR (DVR)'}</span>
            </button>
          </div>
        </div>

        {/* Badges de Datas com Gravações Reais no Disco */}
        {availableDates.length > 0 && (
          <div className="pt-2 border-t border-slate-800/40 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" /> Datas Disponíveis no Disco:
            </span>
            {availableDates.map((d) => {
              const isSelected = selectedDate === d.date;
              const formattedDate = d.date.split('-').reverse().join('/');
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d.date);
                    executeDvrSearch({ dt: d.date });
                    fetchTimelineData(selectedCameraId, d.date);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800'
                  }`}
                >
                  <span>{formattedDate}</span>
                  <span className={`text-[9px] px-1 rounded-full ${isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-950 text-cyan-400'}`}>
                    {d.count}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setSelectedDate('ALL');
                executeDvrSearch({ dt: 'ALL' });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                selectedDate === 'ALL'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Todas as Datas
            </button>
          </div>
        )}
      </div>

      {/* BARRA DE LINHA DO TEMPO 24 HORAS (TIMELINE DVR PROFISSIONAL) */}
      {selectedDate && selectedDate !== 'ALL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white">Linha do Tempo 24h</span>
              <span className="text-slate-400 font-mono">
                ({selectedDate.split('-').reverse().join('/')} - {selectedCameraId === 'ALL' ? 'Todas as Câmeras' : activeCamera?.name || selectedCameraId})
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Gravação Contínua
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Movimento
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" /> Alerta IA
              </span>
            </div>
          </div>

          {/* Visual 24h Bar */}
          <div
            ref={timelineBarRef}
            onClick={handleTimelineClick}
            onMouseMove={(e) => {
              if (!timelineBarRef.current) return;
              const rect = timelineBarRef.current.getBoundingClientRect();
              const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
              const sec = Math.floor((x / rect.width) * 86400);
              setTimelineHoverSec(sec);
              setTimelineHoverPos(x);
            }}
            onMouseLeave={() => setTimelineHoverSec(null)}
            className="relative h-10 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden cursor-pointer select-none group"
            title="Clique para saltar a reprodução para qualquer momento do dia"
          >
            {/* Background 24h Hour Grid */}
            <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="h-full border-r border-slate-700 flex-1" />
              ))}
            </div>

            {/* Segment blocks representing recorded video slices */}
            {timelineSegments.map((seg) => {
              const leftPercent = (seg.startSec / 86400) * 100;
              const widthPercent = Math.max(0.3, ((seg.endSec - seg.startSec) / 86400) * 100);
              const colorClass =
                seg.type === 'ai'
                  ? 'bg-cyan-400 hover:bg-cyan-300'
                  : seg.type === 'motion'
                  ? 'bg-amber-400 hover:bg-amber-300'
                  : 'bg-emerald-500 hover:bg-emerald-400';

              const isActive = activeRecording?.id === seg.id;

              return (
                <div
                  key={seg.id}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  className={`absolute top-1 bottom-1 rounded-sm transition-all ${colorClass} ${
                    isActive ? 'ring-2 ring-white shadow-lg' : 'opacity-90'
                  }`}
                  title={`${seg.cameraName} (${seg.startTime.split(' ')[1]} - ${seg.endTime.split(' ')[1]})`}
                />
              );
            })}

            {/* Red Playhead line indicating current playback position in the day */}
            {currentPlaybackDaySec !== null && (
              <div
                style={{ left: `${(currentPlaybackDaySec / 86400) * 100}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 shadow-md z-30 pointer-events-none"
              >
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full -ml-1 -mt-0.5 shadow-lg" />
              </div>
            )}

            {/* Hover Tooltip */}
            {timelineHoverSec !== null && (
              <div
                style={{ left: `${timelineHoverPos}px` }}
                className="absolute -top-7 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white font-mono text-[10px] px-2 py-0.5 rounded shadow pointer-events-none z-40 whitespace-nowrap font-bold"
              >
                {formatSecondsToClock(timelineHoverSec)}
              </div>
            )}
          </div>

          {/* Hour Tick Marks (00:00 to 24:00) */}
          <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 pointer-events-none">
            {['00h', '02h', '04h', '06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h', '24h'].map(
              (tick) => (
                <span key={tick}>{tick}</span>
              )
            )}
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL: PLAYER DVR + LISTAGEM DE CLIPES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PLAYER DVR DE ALTA DEFINIÇÃO */}
        <div className="lg:col-span-2 space-y-3">
          {activeRecording ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3">
              {/* OSD Header Bar */}
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-white text-sm">{activeRecording.cameraName}</span>
                  <span className="text-slate-400 font-mono text-[11px]">| OSD: {currentPlaybackClock}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700 font-bold">
                    HD 1080p H.264
                  </span>
                  <span className="text-[10px] font-mono bg-slate-800 text-cyan-300 px-2 py-0.5 rounded border border-slate-700">
                    {activeRecording.fileSizeMB} MB
                  </span>
                </div>
              </div>

              {/* Viewport de Vídeo com Aspect Ratio 16:9 */}
              <div
                ref={playerBoxRef}
                className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center cursor-pointer group"
                onClick={() => {
                  if (isVaultUnlocked) {
                    setIsPlaying(!isPlaying);
                  }
                }}
              >
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
                  muted={isMuted}
                  onTimeUpdate={(e) => {
                    setCurrentTime(Math.floor(e.currentTarget.currentTime));
                  }}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                />

                {/* Overlays / OSD no Vídeo */}
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-mono text-emerald-400 border border-slate-800 pointer-events-none">
                  REC • {currentPlaybackClock}
                </div>

                {/* E2EE Lock Overlay se bloqueado */}
                {!isVaultUnlocked && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 text-center p-6 z-40"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-white">Gravação Protegida por Criptografia E2EE</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Insira a chave mestra do cofre para reproduzir este clipe em alta definição.
                    </p>
                    <button
                      onClick={onUnlockVault}
                      className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-emerald-400 transition"
                    >
                      Desbloquear Cofre
                    </button>
                  </div>
                )}
              </div>

              {/* Controles de Reprodução Estilo DVR Profissional */}
              <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                {/* Barra de Progresso / Scrubber */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 bg-slate-800 hover:bg-emerald-500 text-white hover:text-slate-950 rounded-lg transition shrink-0 shadow"
                    title={isPlaying ? 'Pausar' : 'Reproduzir'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition shrink-0"
                    title="Retroceder 10 segundos"
                  >
                    <Rewind className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSeek(Math.min(activeRecording.durationSeconds || 300, currentTime + 10))}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition shrink-0"
                    title="Avançar 10 segundos"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={activeRecording.durationSeconds || 1}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseInt(e.target.value, 10))}
                    className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />

                  <span className="text-xs font-mono text-slate-300 font-bold shrink-0">
                    {formatDuration(currentTime)} / {formatDuration(activeRecording.durationSeconds || 0)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition shrink-0"
                    title={isMuted ? 'Ativar Áudio' : 'Mutar Áudio'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition shrink-0"
                    title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>

                {/* Velocidades DVR e Ações */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-900">
                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] text-slate-400 font-bold mr-1">Velocidade:</span>
                    {[0.5, 1, 2, 4, 8, 16].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                          playbackSpeed === speed
                            ? 'bg-emerald-500 text-slate-950 shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadClip}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition"
                      title="Baixar arquivo MP4 deste trecho"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Baixar Trecho MP4</span>
                    </button>

                    {canDeleteRecordings && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir permanentemente a gravação de ${activeRecording.cameraName}?`)) {
                            const idToDelete = activeRecording.id;
                            setActiveRecording(null);
                            setIsPlaying(false);
                            onDeleteRecording(idToDelete);
                            setTimeout(() => {
                              executeDvrSearch();
                              fetchTimelineData(selectedCameraId, selectedDate);
                            }, 500);
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition"
                        title="Excluir gravação permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Video className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-white text-base">Nenhum clipe selecionado</h4>
                <p className="text-xs text-slate-400">
                  {effectiveRecordings.length === 0
                    ? 'Nenhuma gravação encontrada com os filtros atuais. Selecione outra data, câmera ou clique em "Sincronizar Disco" se acabou de enviar arquivos.'
                    : 'Selecione um dos blocos encontrados ao lado para iniciar a reprodução imediata no player DVR.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleScanDisk}
                  disabled={isScanningDisk}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanningDisk ? 'animate-spin' : ''}`} />
                  <span>Sincronizar e Varrer Disco</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LISTA / GRID DE RESULTADOS DA BUSCA DVR */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Resultados da Busca
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Visualização em Grade"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'table' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Visualização em Lista / Tabela"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  {effectiveRecordings.length}
                </span>
              </div>
            </div>

            {/* Ações em Lote */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <label className="flex items-center space-x-2 font-bold text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={effectiveRecordings.length > 0 && selectedIds.length === effectiveRecordings.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <span>Marcar Todas ({effectiveRecordings.length})</span>
              </label>

              {canDeleteRecordings && selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Excluir ({selectedIds.length})</span>
                </button>
              )}
            </div>

            {/* Container com Scroll para Clipes */}
            <div className="max-h-[580px] overflow-y-auto space-y-2 pr-1">
              {effectiveRecordings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-3">
                  <Film className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="font-bold text-slate-200 text-sm">Nenhuma gravação no intervalo selecionado</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Não foram encontradas imagens para o período de {selectedStartTime} até {selectedEndTime} na data selecionada.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => applyPresetTime('00:00', '23:59')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
                    >
                      Buscar Dia Todo (24h)
                    </button>
                    <button
                      type="button"
                      onClick={handleScanDisk}
                      disabled={isScanningDisk}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanningDisk ? 'animate-spin' : ''}`} />
                      <span>Sincronizar Pasta /recordings</span>
                    </button>
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                effectiveRecordings.map((rec) => {
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
                          ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md text-emerald-300'
                          : isChecked
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectOne(rec.id);
                          }}
                          className="p-1 cursor-pointer shrink-0"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer pointer-events-none"
                          />
                        </div>

                        <div className="relative shrink-0">
                          <img
                            src={thumbUrl}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-800 bg-black"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="absolute -bottom-1 -right-1 text-slate-950 text-[8px] font-black px-1 rounded bg-emerald-400 border border-slate-950">
                            {formatDuration(rec.durationSeconds || 300)}
                          </span>
                        </div>

                        <div className="truncate">
                          <h5 className="font-bold text-xs truncate text-white">{rec.cameraName}</h5>
                          <p className="text-[10px] font-mono text-slate-400">{rec.startTime}</p>
                          <p className="text-[10px] font-mono text-emerald-400 font-semibold">
                            {rec.durationSeconds >= 270 ? '5 min (Contínuo)' : formatDuration(rec.durationSeconds || 0)} • {rec.fileSizeMB} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title="Baixar trecho MP4"
                          onClick={(e) => {
                            e.stopPropagation();
                            const a = document.createElement('a');
                            a.href = rec.streamUrl;
                            a.download = `rec_${rec.cameraName}_${rec.startTime.replace(/[: ]/g, '-')}.mp4`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="p-1.5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {canDeleteRecordings && (
                          <button
                            type="button"
                            title="Excluir gravação"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Deseja realmente excluir esta gravação de ${rec.cameraName}?`)) {
                                if (activeRecording?.id === rec.id) {
                                  setActiveRecording(null);
                                  setIsPlaying(false);
                                }
                                onDeleteRecording(rec.id);
                                setTimeout(() => {
                                  executeDvrSearch();
                                  fetchTimelineData(selectedCameraId, selectedDate);
                                }, 500);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Modo Tabela / Lista Detalhada */
                <table className="w-full text-[11px] text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-left font-mono text-[10px]">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Câmera</th>
                      <th className="p-2">Início</th>
                      <th className="p-2">Duração</th>
                      <th className="p-2">Tam.</th>
                      <th className="p-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveRecordings.map((rec) => {
                      const isActive = activeRecording?.id === rec.id;
                      const isChecked = selectedIds.includes(rec.id);

                      return (
                        <tr
                          key={rec.id}
                          onClick={() => {
                            setActiveRecording(rec);
                            setCurrentTime(0);
                            setIsPlaying(true);
                          }}
                          className={`border-b border-slate-850 hover:bg-slate-800/60 cursor-pointer transition ${
                            isActive ? 'bg-emerald-500/15 text-emerald-300 font-bold' : ''
                          }`}
                        >
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOne(rec.id)}
                              className="accent-emerald-500 rounded"
                            />
                          </td>
                          <td className="p-2 truncate font-semibold text-white">{rec.cameraName}</td>
                          <td className="p-2 font-mono">{rec.startTime.split(' ')[1] || rec.startTime}</td>
                          <td className="p-2 font-mono text-emerald-400">{formatDuration(rec.durationSeconds || 300)}</td>
                          <td className="p-2 font-mono">{rec.fileSizeMB} MB</td>
                          <td className="p-2 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRecording(rec);
                                setCurrentTime(0);
                                setIsPlaying(true);
                              }}
                              className="text-[10px] text-emerald-400 hover:underline font-bold"
                            >
                              Assistir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE GERENCIAMENTO DE ARMAZENAMENTO FIFO */}
      {showStorageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                Gerenciar Armazenamento de Gravações (FIFO)
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
                  Limite de Armazenamento do Gravador (GB):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={storageLimitGB}
                    onChange={(e) => setStorageLimitGB(Math.max(10, parseInt(e.target.value) || 100))}
                    className="bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-sm w-full outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                  <span className="text-xs font-mono text-slate-400 font-bold">GB</span>
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
                  Total de gravações ativas: <strong className="text-white">{recordings.length}</strong> blocos.
                </p>
              </div>

              {storageSaveSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Limite de {storageLimitGB} GB salvo com sucesso!</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 gap-2">
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={storageSaving}
                onClick={handleSaveStorageConfig}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {storageSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{storageSaving ? 'Salvando...' : 'Salvar Configuração'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
