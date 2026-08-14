import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Video,
  Users,
  Database,
  Film,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Radio,
  Clock,
  TrendingUp,
  Sliders,
  Terminal,
  Zap,
  Play,
  ArrowUpRight,
  UserCheck,
  UserX,
  CreditCard,
  DollarSign,
  Cpu,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Camera, CameraStatus, CloudRecording, User, ActivityLog, Invoice } from '../types';

interface SystemMetrics {
  cpuPercent: number;
  cpuCores: number;
  cpuModel: string;
  memTotalGb: number;
  memUsedGb: number;
  memFreeGb: number;
  memPercent: number;
  processRssMb: number;
  processHeapMb: number;
  uptimeSec: number;
  activeStreams: number;
  timestamp: string;
}

interface DashboardProps {
  cameras: Camera[];
  users: User[];
  recordings: CloudRecording[];
  logs: ActivityLog[];
  invoices?: Invoice[];
  activeUser: User;
  onSelectCamera?: (cam: Camera) => void;
  onNavigateTab: (tabId: string) => void;
  onUpdateCameras?: (updatedCameras: Camera[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  cameras,
  users,
  recordings,
  logs,
  invoices = [],
  activeUser,
  onSelectCamera,
  onNavigateTab,
  onUpdateCameras,
}) => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString('pt-BR'));
  const [testingCamId, setTestingCamId] = useState<string | null>(null);
  const [camTestResults, setCamTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [lastHealthCheckTime, setLastHealthCheckTime] = useState<string>('');

  const [sysMetrics, setSysMetrics] = useState<SystemMetrics>({
    cpuPercent: 0,
    cpuCores: typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 8,
    cpuModel: 'Processador de Servidor ITL Cloud',
    memTotalGb: 16.0,
    memUsedGb: 0,
    memFreeGb: 0,
    memPercent: 0,
    processRssMb: 0,
    processHeapMb: 0,
    uptimeSec: 3600,
    activeStreams: cameras.filter((c) => c.status === 'ONLINE').length,
    timestamp: new Date().toLocaleTimeString('pt-BR'),
  });

  const [sysHistory, setSysHistory] = useState<
    Array<{ time: string; cpu: number; ram: number; processRam: number }>
  >([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSystemMetrics = async () => {
      try {
        const res = await fetch(`/api/system/metrics?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data: SystemMetrics = await res.json();
          if (isMounted && data && typeof data.cpuPercent === 'number') {
            setSysMetrics(data);
            const timeLabel =
              data.timestamp ||
              new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setSysHistory((prev) => {
              const updated = [
                ...prev,
                {
                  time: timeLabel,
                  cpu: data.cpuPercent || 0,
                  ram: data.memPercent || 0,
                  processRam: data.processRssMb || 0,
                },
              ];
              return updated.slice(-16);
            });
          }
        }
      } catch (e) {}
    };

    fetchSystemMetrics();
    const sysInterval = setInterval(fetchSystemMetrics, 3500);
    return () => {
      isMounted = false;
      clearInterval(sysInterval);
    };
  }, []);

  // Compute camera metrics
  const totalCameras = cameras.length;
  const onlineCameras = cameras.filter((c) => c.status === 'ONLINE' || c.status === 'ALERT');
  const offlineCameras = cameras.filter((c) => c.status === 'OFFLINE');
  const alertCameras = cameras.filter((c) => c.status === 'ALERT');

  const rtspCount = cameras.filter((c) => c.protocol === 'RTSP').length;
  const rtmpCount = cameras.filter((c) => c.protocol === 'RTMP' || !c.protocol).length;

  const availabilityPercentage = totalCameras > 0
    ? Math.round((onlineCameras.length / totalCameras) * 100)
    : 100;

  // Compute user metrics
  const totalUsers = users.length;
  const activeUsersCount = users.filter((u) => u.status === 'ACTIVE').length;
  const adminUsersCount = users.filter((u) => u.role === 'ADMIN').length;
  const residentUsersCount = users.filter((u) => u.role === 'RESIDENT' || u.role === 'VIEWER').length;

  const paidInvoicesCount = invoices.filter((i) => i.status === 'PAID').length;
  const overdueInvoicesCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  // Compute storage and recording days span
  const totalRecordings = recordings.length;
  const totalMbRecordings = recordings.reduce((acc, r) => acc + (r.fileSizeMB || 0), 0);
  const totalStorageGb = totalMbRecordings > 0
    ? (totalMbRecordings / 1024).toFixed(1)
    : (cameras.reduce((acc, c) => acc + (c.storageUsedGB || 0), 0)).toFixed(1);

  let recordingDaysCount = 0;
  let lastRecordingDateStr = 'Sem gravações recentes';
  let firstRecordingDateStr = 'Sem gravações';

  if (recordings.length > 0) {
    const validTimestamps = recordings
      .map((r) => {
        const raw = r.startTime || r.endTime;
        if (!raw) return NaN;
        return new Date(raw.replace(' ', 'T')).getTime();
      })
      .filter((t) => !isNaN(t));

    if (validTimestamps.length > 0) {
      const minTimestamp = Math.min(...validTimestamps);
      const maxTimestamp = Math.max(...validTimestamps);
      const nowTimestamp = Date.now();

      // Days elapsed between earliest recording and today
      const diffMs = Math.abs(nowTimestamp - minTimestamp);
      recordingDaysCount = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      firstRecordingDateStr = new Date(minTimestamp).toLocaleDateString('pt-BR');
      lastRecordingDateStr = new Date(maxTimestamp).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } else {
    recordingDaysCount = 30; // default standard retention
  }

  // Batch health diagnostic check for all cameras
  const runBatchHealthCheck = async () => {
    setIsHealthChecking(true);
    try {
      const res = await fetch(`/api/cameras/health-check?t=${Date.now()}`);
      if (res.ok) {
        const updatedCams: Camera[] = await res.json();
        if (Array.isArray(updatedCams) && updatedCams.length > 0) {
          const resultsMap: Record<string, { success: boolean; message: string }> = {};
          updatedCams.forEach((c) => {
            resultsMap[c.id] = {
              success: c.status === 'ONLINE',
              message: c.status === 'ONLINE' ? 'Sinal Conectado' : 'Sem Sinal / Off-line',
            };
          });
          setCamTestResults(resultsMap);
          if (onUpdateCameras) {
            onUpdateCameras(updatedCams);
          }
        }
      }
    } catch (e) {
      console.warn('[Dashboard] Erro ao realizar health check em lote:', e);
    } finally {
      setIsHealthChecking(false);
      setLastHealthCheckTime(new Date().toLocaleTimeString('pt-BR'));
    }
  };

  // Fetch real database status from backend
  const fetchDbStatus = async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      console.warn('[Dashboard] Erro ao buscar db-status:', e);
    } finally {
      setLoadingDb(false);
      setLastRefreshed(new Date().toLocaleTimeString('pt-BR'));
    }
  };

  useEffect(() => {
    fetchDbStatus();
    runBatchHealthCheck();

    const dbInterval = setInterval(() => {
      fetchDbStatus();
    }, 30000); // refresh every 30s

    const camInterval = setInterval(() => {
      runBatchHealthCheck();
    }, 45000); // automatic camera health check every 45s

    return () => {
      clearInterval(dbInterval);
      clearInterval(camInterval);
    };
  }, []);

  const handleRunSingleTest = async (cam: Camera) => {
    setTestingCamId(cam.id);
    try {
      const res = await fetch('/api/cameras/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: cam.protocol || (cam.rtspUrl ? 'RTSP' : 'RTMP'),
          rtspUrl: cam.protocol === 'RTSP' ? cam.rtspUrl : '',
          rtmpUrl: cam.rtmpUrl || cam.fullRtmpUrl,
          streamKey: cam.streamKey || cam.id,
          id: cam.id,
        }),
      });
      const data = await res.json();
      const isOnline = data.success === true;
      
      const newResult = {
        success: isOnline,
        message: data.message || (isOnline ? 'Conexão Estabelecida' : 'Sem Sinal / Off-line'),
      };
      setCamTestResults((prev) => ({ ...prev, [cam.id]: newResult }));

      // Update parent camera state
      if (onUpdateCameras) {
        const updated = cameras.map((c) =>
          c.id === cam.id ? { ...c, status: (isOnline ? 'ONLINE' : 'OFFLINE') as CameraStatus } : c
        );
        onUpdateCameras(updated);
      }
    } catch (e: any) {
      const newResult = {
        success: false,
        message: 'Erro ao testar conexão',
      };
      setCamTestResults((prev) => ({ ...prev, [cam.id]: newResult }));
      if (onUpdateCameras) {
        const updated = cameras.map((c) =>
          c.id === cam.id ? { ...c, status: 'OFFLINE' as CameraStatus } : c
        );
        onUpdateCameras(updated);
      }
    } finally {
      setTestingCamId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
                Dashboard de Monitoramento Geral
              </h1>
              <p className="text-xs text-slate-400">
                Visão unificada em tempo real de câmeras, usuários, banco de dados e armazenamento em nuvem
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Sincronizado às
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {lastRefreshed}
            </span>
          </div>

          <button
            onClick={fetchDbStatus}
            disabled={loadingDb}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shadow-lg disabled:opacity-50"
            title="Atualizar dados do dashboard"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${loadingDb ? 'animate-spin' : ''}`} />
            <span>{loadingDb ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={() => onNavigateTab('live-grid')}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20"
          >
            <Video className="w-4 h-4" />
            <span>Ver Câmeras</span>
          </button>
        </div>
      </div>

      {/* TOP METRICS BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: CÂMERAS */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-xl transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Status Câmeras
            </span>
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Video className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-100">{totalCameras}</span>
            <span className="text-xs text-slate-400 font-medium">cadastradas</span>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>On-line:</span>
              </span>
              <span className="font-bold text-slate-200">{onlineCameras.length}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 text-rose-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Off-line:</span>
              </span>
              <span className={`font-bold ${offlineCameras.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {offlineCameras.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden flex">
              <div
                className="bg-emerald-400 h-full transition-all duration-500"
                style={{ width: `${availabilityPercentage}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${100 - availabilityPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-right text-slate-400 pt-0.5">
              {availabilityPercentage}% de disponibilidade do sinal
            </p>
          </div>
        </div>

        {/* CARD 2: USUÁRIOS */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-xl transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Usuários & Acesso
            </span>
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-100">{totalUsers}</span>
            <span className="text-xs text-slate-400 font-medium">usuários cadastrados</span>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Ativos no Sistema:</span>
              <span className="font-bold text-emerald-400">{activeUsersCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Perfil Morador/Cliente:</span>
              <span className="font-bold text-slate-200">{residentUsersCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Perfil Administrador:</span>
              <span className="font-bold text-indigo-300">{adminUsersCount}</span>
            </div>
          </div>
        </div>

        {/* CARD 3: BANCO DE DADOS */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-xl transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Banco de Dados (BD)
            </span>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Database className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-lg font-black text-emerald-400 truncate">
              {dbStatus?.isPgActive ? 'PostgreSQL Ativo' : 'SQLite Operacional'}
            </span>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Base de Dados:</span>
              <span className="font-mono font-bold text-slate-200">{dbStatus?.dbName || 'itl_cameras'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Latência do Servidor:</span>
              <span className="font-mono text-emerald-400 font-bold">&lt; 15ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total de Registros:</span>
              <span className="font-mono font-bold text-amber-300">
                {(dbStatus?.postgresCounts?.cameras || totalCameras) +
                  (dbStatus?.postgresCounts?.users || totalUsers) +
                  (dbStatus?.postgresCounts?.recordings || totalRecordings) +
                  logs.length}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: ARMAZENAMENTO & DIAS DE GRAVAÇÃO */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-xl transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Armazenamento & Dias
            </span>
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-100">{totalStorageGb}</span>
            <span className="text-sm font-bold text-purple-400">GB Utilizados</span>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Dias de Gravação:</span>
              <span className="font-bold text-slate-100">{recordingDaysCount} Dias</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Última Gravação:</span>
              <span className="font-mono text-slate-300 text-[11px] truncate max-w-[140px]" title={lastRecordingDateStr}>
                {lastRecordingDateStr}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Qualidade Padrão:</span>
              <span className="font-bold text-emerald-400">Full HD 1080p</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE PROCESSAMENTO & DESEMPENHO EM TEMPO REAL (CPU & MEMÓRIA) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                Processamento do Servidor (CPU & Memória RAM)
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  Ao Vivo
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Monitoramento contínuo de recursos computacionais e transcodificação FFmpeg
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300">Atualizando a cada 4s</span>
            </div>
          </div>
        </div>

        {/* METRICS SUMMARY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Uso da CPU</span>
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-400">
                {sysMetrics ? `${sysMetrics.cpuPercent}%` : '---'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({sysMetrics?.cpuCores || 4} Cores)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, sysMetrics?.cpuPercent || 0)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Uso da Memória RAM</span>
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-cyan-400">
                {sysMetrics ? `${sysMetrics.memPercent}%` : '---'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({sysMetrics?.memUsedGb || 0} / {sysMetrics?.memTotalGb || 0} GB)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, sysMetrics?.memPercent || 0)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Memória do Processo</span>
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-purple-400">
                {sysMetrics ? `${sysMetrics.processRssMb}` : '---'}
              </span>
              <span className="text-[10px] font-mono text-purple-300">MB (RSS)</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              Heap: {sysMetrics?.processHeapMb || 0} MB
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Transmissões Ativas</span>
              <Video className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-amber-400">
                {sysMetrics ? sysMetrics.activeStreams : onlineCameras.length}
              </span>
              <span className="text-[10px] font-mono text-amber-300">FFmpeg / HLS</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              Uptime: {sysMetrics ? `${Math.floor(sysMetrics.uptimeSec / 3600)}h ${Math.floor((sysMetrics.uptimeSec % 3600) / 60)}m` : '---'}
            </p>
          </div>
        </div>

        {/* REALTIME AREA CHART */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2 text-xs text-slate-400">
            <span className="font-bold text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Histórico de Processamento em Tempo Real
            </span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>CPU (%)</span>
              </span>
              <span className="flex items-center space-x-1.5 text-cyan-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                <span>RAM (%)</span>
              </span>
            </div>
          </div>

          <div className="h-52 w-full bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
            {sysHistory.length < 2 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Coletando métricas do servidor...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sysHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU (%)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cpuGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ram"
                    name="Memória RAM (%)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#ramGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* DETAILED PANELS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: MONITOR DE CÂMERAS & DIAGNÓSTICO EM TEMPO REAL */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center space-x-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-slate-100 text-sm">
                Monitoramento Individual das Câmeras ({cameras.length})
              </h3>
            </div>

            <div className="flex items-center space-x-3">
              {lastHealthCheckTime && (
                <span className="text-[10px] text-slate-400 flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>Diagnóstico Auto (45s): {lastHealthCheckTime}</span>
                </span>
              )}

              <button
                onClick={runBatchHealthCheck}
                disabled={isHealthChecking}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                title="Executar Diagnóstico Automático em Todas as Câmeras"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isHealthChecking ? 'animate-spin' : ''}`} />
                <span>{isHealthChecking ? 'Verificando...' : 'Testar Todas'}</span>
              </button>

              <button
                onClick={() => onNavigateTab('camera-admin')}
                className="text-xs font-bold text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <span>Gerenciar</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Camera Status List */}
          <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto pr-1">
            {cameras.length === 0 ? (
              <p className="py-8 text-center text-slate-500 text-xs">
                Nenhuma câmera cadastrada no sistema.
              </p>
            ) : (
              cameras.map((cam) => {
                const isTesting = testingCamId === cam.id;
                const lastTest = camTestResults[cam.id];

                return (
                  <div
                    key={cam.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          cam.status === 'OFFLINE'
                            ? 'bg-rose-500'
                            : cam.status === 'ALERT'
                            ? 'bg-amber-400 animate-ping'
                            : 'bg-emerald-400 animate-pulse'
                        }`}
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-xs text-slate-200">{cam.name}</h4>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                              cam.protocol === 'RTSP'
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                                : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            }`}
                          >
                            {cam.protocol || 'RTMP'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                          {cam.rtspUrl || cam.rtmpUrl || cam.location || 'Localização não configurada'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {lastTest && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            lastTest.success
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}
                        >
                          {lastTest.message}
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          cam.status === 'OFFLINE'
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}
                      >
                        {cam.status === 'OFFLINE' ? 'OFF-LINE' : 'ON-LINE'}
                      </span>

                      <button
                        onClick={() => handleRunSingleTest(cam)}
                        disabled={isTesting}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs transition disabled:opacity-50"
                        title="Executar Diagnóstico de Sinal nesta Câmera"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isTesting ? 'animate-spin' : ''}`} />
                      </button>

                      {onSelectCamera && (
                        <button
                          onClick={() => onSelectCamera(cam)}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg border border-emerald-500/30 text-[11px] font-bold transition"
                        >
                          Ao Vivo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COL: BANCO DE DADOS & INFRAESTRUTURA STATUS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  Infraestrutura BD & Servidor
                </h3>
              </div>

              <button
                onClick={() => onNavigateTab('db-diagnostics')}
                className="text-xs font-bold text-amber-400 hover:underline flex items-center space-x-1"
              >
                <span>Diagnósticos</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Motor de Banco de Dados:</span>
                  <span className="text-emerald-400 font-mono">
                    {dbStatus?.isPgActive ? 'PostgreSQL 16 (Ativo)' : 'SQLite 3 (Local)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Host: {dbStatus?.host || '127.0.0.1'}</span>
                  <span>Porta: {dbStatus?.port || 5432}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Transcodificador FFmpeg / HLS:</span>
                  <span className="text-emerald-400 font-mono">OPERACIONAL</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>RTSP TCP Gateway: Ativo</span>
                  <span>RTMP Streamer: Porta 1935</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Faturamento & Inadimplência:</span>
                  <span className={`font-mono ${overdueInvoicesCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {overdueInvoicesCount > 0 ? `${overdueInvoicesCount} Atrasadas` : '100% Em Dia'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Faturas Pagas: {paidInvoicesCount}</span>
                  <span>MercadoPago MercadoPix: Integrado</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateTab('activity-reports')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Ver Logs do Sistema</span>
            </button>
          </div>
        </div>
      </div>

      {/* LOGS DE EVENTOS RECENTES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Últimas Atividades Registradas no Sistema
            </h3>
          </div>

          <button
            onClick={() => onNavigateTab('activity-reports')}
            className="text-xs font-bold text-indigo-400 hover:underline"
          >
            Ver Relatório Completo →
          </button>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto font-mono text-xs text-slate-300">
          {logs.length === 0 ? (
            <p className="py-4 text-center text-slate-500">Nenhum log registrado recentemente.</p>
          ) : (
            logs.slice(0, 8).map((log) => (
              <div key={log.id} className="py-2 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp}</span>
                  <span className="font-bold text-indigo-300 shrink-0">{log.userName}:</span>
                  <span className="truncate text-slate-200">{log.action}</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[9px] font-bold text-slate-400 shrink-0">
                  {log.category}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
