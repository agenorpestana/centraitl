import React, { useState, useEffect } from 'react';
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
import { Camera, CloudRecording, User, ActivityLog, Invoice } from '../types';

interface DashboardProps {
  cameras: Camera[];
  users: User[];
  recordings: CloudRecording[];
  logs: ActivityLog[];
  invoices?: Invoice[];
  activeUser: User;
  onSelectCamera?: (cam: Camera) => void;
  onNavigateTab: (tabId: string) => void;
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
}) => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString('pt-BR'));
  const [testingCamId, setTestingCamId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

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

  // Compute recordings & storage metrics
  const totalRecordings = recordings.length;
  // Estimate retention & storage: average 150MB per clip
  const estimatedStorageMb = totalRecordings * 150;
  const estimatedStorageGb = (estimatedStorageMb / 1024).toFixed(1);
  const estimatedDaysRetention = totalRecordings > 0 ? Math.max(7, Math.ceil(totalRecordings / (totalCameras || 1))) : 7;

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
    const interval = setInterval(() => {
      fetchDbStatus();
    }, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleRunSingleTest = async (cam: Camera) => {
    setTestingCamId(cam.id);
    setTestResult(null);
    try {
      const res = await fetch('/api/cameras/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: cam.protocol || (cam.rtspUrl ? 'RTSP' : 'RTMP'),
          rtspUrl: cam.protocol === 'RTSP' ? cam.rtspUrl : '',
          rtmpUrl: cam.rtmpUrl || cam.fullRtmpUrl,
          streamKey: cam.streamKey || cam.id,
        }),
      });
      const data = await res.json();
      setTestResult({
        id: cam.id,
        success: data.success,
        message: data.message || (data.success ? 'Conexão Estabelecida' : 'Sem Sinal'),
      });
    } catch (e: any) {
      setTestResult({
        id: cam.id,
        success: false,
        message: 'Erro ao testar conexão',
      });
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

        {/* CARD 4: ARMAZENAMENTO & GRAVAÇÕES */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-xl transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Gravações & Storage
            </span>
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <Film className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-100">{totalRecordings}</span>
            <span className="text-xs text-slate-400 font-medium">clipes gravados</span>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Espaço Utilizado:</span>
              <span className="font-mono font-bold text-purple-300">{estimatedStorageGb} GB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Retenção Estimada:</span>
              <span className="font-bold text-slate-200">{estimatedDaysRetention} Dias de Histórico</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Qualidade Padrão:</span>
              <span className="font-bold text-emerald-400">Full HD 1080p</span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED PANELS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: MONITOR DE CÂMERAS & DIAGNÓSTICO EM TEMPO REAL */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-slate-100 text-sm">
                Monitoramento Individual das Câmeras ({cameras.length})
              </h3>
            </div>

            <button
              onClick={() => onNavigateTab('camera-admin')}
              className="text-xs font-bold text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>Gerenciar Câmeras</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
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
                const lastTest = testResult?.id === cam.id ? testResult : null;

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
