import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Calendar,
  Clock,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Download,
  CheckCircle2,
  Lock,
  Server,
  Cloud,
  FileCode,
  FileText,
  RotateCcw,
  Trash2,
  Upload,
  AlertTriangle,
  Check,
  X,
  Layers,
  Sparkles,
  ArrowDownToLine,
  FolderArchive,
  Info,
} from 'lucide-react';
import { BackupConfig, BackupItemRecord, User } from '../types';

interface BackupManagerProps {
  config: BackupConfig;
  activeUser: User;
  onTriggerBackup: () => void;
  onUpdateConfig: (newConfig: Partial<BackupConfig>) => void;
}

interface ServerBackupInfo extends BackupConfig {
  isPgActive?: boolean;
  dbName?: string;
  dbHost?: string;
  counts?: {
    cameras: number;
    users: number;
    recordings: number;
    plans: number;
    invoices: number;
    companies: number;
  };
  availableFiles?: BackupItemRecord[];
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  config,
  activeUser,
  onTriggerBackup,
  onUpdateConfig,
}) => {
  const [serverInfo, setServerInfo] = useState<ServerBackupInfo | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupItemRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{ title: string; message: string } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreTab, setRestoreTab] = useState<'JSON' | 'POSTGRESQL'>('JSON');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreText, setRestoreText] = useState<string>('');
  const [restorePreview, setRestorePreview] = useState<{
    valid: boolean;
    type: 'JSON' | 'POSTGRESQL';
    summary: string;
    stats?: Record<string, number>;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Quick Confirm for Stored File Restore
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<BackupItemRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load backups list and database status from server
  const fetchBackupData = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data: ServerBackupInfo = await res.json();
        setServerInfo(data);
        if (data.availableFiles) {
          setBackupFiles(data.availableFiles);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados de backup:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBackupData();
  }, []);

  const showSuccess = (title: string, message: string) => {
    setSuccessBanner({ title, message });
    setErrorBanner(null);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const showError = (message: string) => {
    setErrorBanner(message);
    setSuccessBanner(null);
    setTimeout(() => setErrorBanner(null), 7000);
  };

  // 1. Download PostgreSQL .sql dump directly
  const handleDownloadPostgresDump = async () => {
    setActionLoading('download-pg');
    try {
      const res = await fetch('/api/backup/export/postgres');
      if (!res.ok) throw new Error('Falha ao exportar banco PostgreSQL');
      const blob = await res.blob();
      const now = new Date().toISOString().slice(0, 10);
      const filename = `itl_postgres_backup_${now}.sql`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess(
        'Backup do PostgreSQL baixado com sucesso!',
        `O arquivo SQL '${filename}' contém as tabelas, schema DDL e dados de câmeras, usuários, planos e gravações.`
      );
      fetchBackupData();
    } catch (err: any) {
      showError('Erro ao baixar backup PostgreSQL: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Download JSON .json database state directly
  const handleDownloadJsonBackup = async () => {
    setActionLoading('download-json');
    try {
      const res = await fetch('/api/backup/export/json');
      if (!res.ok) throw new Error('Falha ao exportar arquivo JSON');
      const blob = await res.blob();
      const now = new Date().toISOString().slice(0, 10);
      const filename = `itl_backup_store_${now}.json`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess(
        'Backup do Arquivo JSON baixado com sucesso!',
        `O arquivo '${filename}' contém o estado íntegro do sistema (câmeras, gravações, configurações, usuários e planos).`
      );
      fetchBackupData();
    } catch (err: any) {
      showError('Erro ao baixar backup JSON: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Trigger manual backup on server VPS
  const handleTriggerBackup = async (targetType: 'POSTGRESQL' | 'JSON' | 'FULL') => {
    setActionLoading(`trigger-${targetType}`);
    try {
      onTriggerBackup();
      const res = await fetch('/api/backup/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao executar rotina de backup');
      }

      showSuccess(
        'Backup gerado e salvo com sucesso!',
        `Arquivo '${data.file?.filename}' salvo no diretório VPS do servidor (${data.file?.sizeFormatted}).`
      );
      fetchBackupData();
    } catch (err: any) {
      showError('Erro ao executar backup: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Download file from server history
  const handleDownloadFile = (filename: string) => {
    const a = document.createElement('a');
    a.href = `/api/backup/files/${filename}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 5. Delete file from server history
  const handleDeleteFile = async (filename: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o arquivo de backup '${filename}' do servidor?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/backup/files/${filename}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Arquivo removido', `Backup '${filename}' excluído do armazenamento do servidor.`);
        fetchBackupData();
      } else {
        showError(data.error || 'Erro ao remover arquivo');
      }
    } catch (err: any) {
      showError('Erro ao excluir arquivo: ' + err.message);
    }
  };

  // 6. Handle file selection in Restore modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreText(content);
      analyzeContent(content, restoreTab);
    };
    reader.readAsText(file);
  };

  const analyzeContent = (text: string, type: 'JSON' | 'POSTGRESQL') => {
    if (!text || text.trim().length === 0) {
      setRestorePreview(null);
      return;
    }

    if (type === 'JSON') {
      try {
        const parsed = JSON.parse(text);
        const camerasCount = Array.isArray(parsed.cameras) ? parsed.cameras.length : 0;
        const usersCount = Array.isArray(parsed.users) ? parsed.users.length : 0;
        const plansCount = Array.isArray(parsed.plans) ? parsed.plans.length : 0;
        const recordingsCount = Array.isArray(parsed.recordings) ? parsed.recordings.length : 0;
        const companiesCount = Array.isArray(parsed.companies) ? parsed.companies.length : 0;

        setRestorePreview({
          valid: true,
          type: 'JSON',
          summary: `Arquivo JSON Válido! Detectados: ${camerasCount} câmeras, ${usersCount} usuários, ${plansCount} planos, ${recordingsCount} gravações.`,
          stats: {
            Câmeras: camerasCount,
            Usuários: usersCount,
            Planos: plansCount,
            Gravações: recordingsCount,
            Empresas: companiesCount,
          },
        });
      } catch (err) {
        setRestorePreview({
          valid: false,
          type: 'JSON',
          summary: 'Formato inválido. Certifique-se de selecionar um arquivo .json íntegro.',
        });
      }
    } else {
      // PostgreSQL SQL Analysis
      const hasCreateTable = /CREATE TABLE/i.test(text);
      const hasInsert = /INSERT INTO/i.test(text);
      const insertCount = (text.match(/INSERT INTO/gi) || []).length;
      const tableCount = (text.match(/CREATE TABLE/gi) || []).length;

      if (hasCreateTable || hasInsert) {
        setRestorePreview({
          valid: true,
          type: 'POSTGRESQL',
          summary: `Script SQL PostgreSQL Válido! (${tableCount} tabelas DDL, ${insertCount} instruções INSERT detectadas).`,
          stats: {
            'Tabelas Criadas': tableCount,
            'Instruções INSERT': insertCount,
          },
        });
      } else {
        setRestorePreview({
          valid: false,
          type: 'POSTGRESQL',
          summary: 'O arquivo SQL não parece conter instruções DDL/INSERT compatíveis.',
        });
      }
    }
  };

  // 7. Execute Restore
  const handleExecuteRestore = async () => {
    if (!restoreText) {
      showError('Nenhum arquivo ou script selecionado para restauração.');
      return;
    }

    setIsRestoring(true);
    try {
      if (restoreTab === 'JSON') {
        const parsed = JSON.parse(restoreText);
        const res = await fetch('/api/backup/restore/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupData: parsed }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Falha ao restaurar backup JSON');
        }

        showSuccess(
          'Backup JSON Restaurado com Sucesso!',
          `Restaurados: ${data.restored?.cameras || 0} câmeras, ${data.restored?.users || 0} usuários, ${data.restored?.plans || 0} planos financeiros. O estado do sistema foi atualizado.`
        );
      } else {
        const res = await fetch('/api/backup/restore/postgres', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sqlContent: restoreText }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Falha ao restaurar banco PostgreSQL');
        }

        showSuccess(
          'Banco PostgreSQL Restaurado com Sucesso!',
          `Script SQL executado com êxito (${data.statementsExecuted || 0} comandos processados). O banco e memória foram atualizados.`
        );
      }

      setRestoreModalOpen(false);
      setRestoreFile(null);
      setRestoreText('');
      setRestorePreview(null);
      fetchBackupData();
    } catch (err: any) {
      showError('Erro durante a restauração: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  // 8. Restore directly from stored file on server
  const handleExecuteStoredFileRestore = async (file: BackupItemRecord) => {
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/backup/restore/file/${encodeURIComponent(file.filename)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao restaurar arquivo do servidor');
      }

      showSuccess('Backup Restaurado com Sucesso!', data.message || `Arquivo '${file.filename}' restaurado.`);
      setConfirmRestoreFile(null);
      fetchBackupData();
    } catch (err: any) {
      showError('Erro ao restaurar arquivo do servidor: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Central de Backup e Restauração Automatizada
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              100% Funcional
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Cópias de segurança instantâneas do banco de dados <strong className="text-emerald-300">PostgreSQL</strong> e do snapshot de estado <strong className="text-amber-300">.JSON</strong>, com rotinas programadas na VPS e restauração simplificada com 1 clique.
          </p>
        </div>

        {/* Status Indicators & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Banco:</span>
            <span className="text-slate-200 font-mono font-bold">
              {serverInfo?.isPgActive ? `PostgreSQL (${serverInfo.dbName || 'itl_cameras'})` : 'JSON Local / SQLite'}
            </span>
          </div>

          <button
            onClick={fetchBackupData}
            disabled={isRefreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Atualizar Status do Servidor"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {successBanner && (
        <div className="bg-emerald-950/80 border border-emerald-500/80 text-emerald-100 p-4 rounded-2xl flex items-start gap-3 shadow-xl animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-emerald-200 text-sm">{successBanner.title}</p>
            <p className="text-emerald-300/90">{successBanner.message}</p>
          </div>
        </div>
      )}

      {errorBanner && (
        <div className="bg-red-950/80 border border-red-500/80 text-red-100 p-4 rounded-2xl flex items-start gap-3 shadow-xl animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-red-200 text-sm">Atenção na Operação</p>
            <p className="text-red-300/90">{errorBanner}</p>
          </div>
        </div>
      )}

      {/* Action Cards (Backup PostgreSQL, Backup JSON, Restaurar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: PostgreSQL Backup */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-cyan-500/60 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Database className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                .SQL
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-100">Backup Banco PostgreSQL</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Exporta script SQL completo com DDL e dados de câmeras, usuários, planos, faturas e configurações, compatível com PostgreSQL 12+, Supabase e RDS.
              </p>
            </div>

            <div className="text-[11px] font-mono text-cyan-400/90 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Tabelas auditadas:</span>
                <span className="font-bold text-slate-200">10 tabelas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total de registros:</span>
                <span className="font-bold text-slate-200">
                  {((serverInfo?.counts?.cameras || 0) + (serverInfo?.counts?.users || 0) + (serverInfo?.counts?.plans || 0))} itens
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleDownloadPostgresDump}
              disabled={actionLoading === 'download-pg'}
              className="w-full py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition active:scale-[0.99]"
            >
              {actionLoading === 'download-pg' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Baixar Backup PostgreSQL (.sql)</span>
            </button>

            <button
              onClick={() => handleTriggerBackup('POSTGRESQL')}
              disabled={actionLoading === 'trigger-POSTGRESQL'}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              {actionLoading === 'trigger-POSTGRESQL' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Server className="w-3.5 h-3.5" />
              )}
              <span>Gerar e Salvar no Servidor VPS</span>
            </button>
          </div>
        </div>

        {/* Card 2: JSON Backup */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-amber-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-amber-500/60 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <FileCode className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                .JSON
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-100">Backup Arquivo .JSON</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Exporta o arquivo de estado integral da aplicação (<code>itl_database_store.json</code>) contendo câmeras, DVRs, gravações, empresas e configurações.
              </p>
            </div>

            <div className="text-[11px] font-mono text-amber-400/90 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Câmeras:</span>
                <span className="font-bold text-slate-200">{serverInfo?.counts?.cameras ?? config.storageLimitGB ?? 0} ativas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Usuários & Planos:</span>
                <span className="font-bold text-slate-200">
                  {serverInfo?.counts?.users ?? 0} usuários • {serverInfo?.counts?.plans ?? 0} planos
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleDownloadJsonBackup}
              disabled={actionLoading === 'download-json'}
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-[0.99]"
            >
              {actionLoading === 'download-json' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Baixar Arquivo .JSON</span>
            </button>

            <button
              onClick={() => handleTriggerBackup('JSON')}
              disabled={actionLoading === 'trigger-JSON'}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              {actionLoading === 'trigger-JSON' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Server className="w-3.5 h-3.5" />
              )}
              <span>Gerar e Salvar no Servidor VPS</span>
            </button>
          </div>
        </div>

        {/* Card 3: Restore Backup */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-purple-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-purple-500/60 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                RESTAURAÇÃO
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-100">Restaurar Cópia de Segurança</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Restaure o sistema completo a partir de um arquivo <strong className="text-purple-300">.json</strong> ou <strong className="text-purple-300">.sql</strong>. O sistema cria automaticamente um ponto de restauração seguro antes da execução.
              </p>
            </div>

            <div className="text-[11px] font-mono text-purple-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Ponto de restauração automático pré-aplicação</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Atualização de banco e memória em tempo real</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setRestoreTab('JSON');
                setRestoreModalOpen(true);
              }}
              className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition active:scale-[0.99]"
            >
              <Upload className="w-4 h-4" />
              <span>Restaurar Arquivo .JSON</span>
            </button>

            <button
              onClick={() => {
                setRestoreTab('POSTGRESQL');
                setRestoreModalOpen(true);
              }}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Restaurar Banco PostgreSQL (.sql)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Configuration & Server Storage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Automated Scheduling & Retention Settings */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Agendamento e Políticas de Rotina
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
              Cron / Daemon VPS
            </span>
          </h3>

          <div className="space-y-4 text-xs">
            {/* Automatic Backup Target */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Alvo do Backup Automático:
              </label>
              <select
                value={config.backupTarget || 'FULL'}
                onChange={(e) => onUpdateConfig({ backupTarget: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500 font-medium"
              >
                <option value="FULL">Pacote Completo (PostgreSQL .sql + Arquivo .json)</option>
                <option value="POSTGRESQL">Apenas Banco de Dados PostgreSQL (.sql)</option>
                <option value="JSON">Apenas Arquivo de Estado (.json)</option>
              </select>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Frequência de Execução Automática:
              </label>
              <select
                value={config.schedule}
                onChange={(e) => onUpdateConfig({ schedule: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500 font-medium"
              >
                <option value="DAILY_0200">Diário (Todos os dias às 02:00 AM)</option>
                <option value="WEEKLY_SUNDAY_0200">Semanal (Todo Domingo às 02:00 AM)</option>
                <option value="MONTHLY_1ST">Mensal (1º dia de cada mês às 02:00 AM)</option>
              </select>
            </div>

            {/* Retention */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Período de Retenção de Backups:
              </label>
              <select
                value={config.retentionDays}
                onChange={(e) => onUpdateConfig({ retentionDays: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500 font-medium"
              >
                <option value={7}>7 Dias (Manter última semana)</option>
                <option value={15}>15 Dias</option>
                <option value={30}>30 Dias (Padrão Recomendado)</option>
                <option value={90}>90 Dias (3 meses)</option>
                <option value={365}>365 Dias (1 ano)</option>
              </select>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Destino do Armazenamento:
              </label>
              <select
                value={config.destination}
                onChange={(e) => onUpdateConfig({ destination: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500 font-medium"
              >
                <option value="LOCAL_VPS">Servidor Local VPS (/var/www/itl-backups/ ou ./backups)</option>
                <option value="AWS_S3">Amazon Web Services (AWS S3 Bucket)</option>
                <option value="WASABI">Wasabi Hot Cloud Storage</option>
                <option value="GOOGLE_DRIVE">Google Drive Cloud Storage</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="pt-2 space-y-2.5 border-t border-slate-800/80">
              <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.autoBackupEnabled}
                  onChange={(e) => onUpdateConfig({ autoBackupEnabled: e.target.checked })}
                  className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-medium">Backup automático periódico ativado</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.encryptBackups}
                  onChange={(e) => onUpdateConfig({ encryptBackups: e.target.checked })}
                  className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-medium">Criptografia E2EE AES-256 habilitada</span>
              </label>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Último Backup:</span>
                <span className="text-emerald-400 font-mono font-bold">{config.lastBackupDate || 'Recente'}</span>
              </div>
              <div className="flex justify-between">
                <span>Próxima Execução:</span>
                <span className="text-cyan-400 font-mono">{config.nextBackupDate || 'Programado'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stored Backups List on Server VPS */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Backups Salvos no Servidor VPS ({backupFiles.length})
              </h3>
              <button
                onClick={() => handleTriggerBackup('FULL')}
                disabled={actionLoading === 'trigger-FULL'}
                className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3 h-3 ${actionLoading === 'trigger-FULL' ? 'animate-spin' : ''}`} />
                <span>Salvar Agora</span>
              </button>
            </div>

            {/* List of Files */}
            <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {backupFiles.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  Nenhum arquivo de backup gerado ainda no diretório. Clique em um dos botões acima para gerar o primeiro backup.
                </div>
              ) : (
                backupFiles.map((file) => (
                  <div
                    key={file.id || file.filename}
                    className="p-3 bg-slate-950 hover:bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition"
                  >
                    <div className="flex items-start gap-2.5 truncate">
                      <div className="mt-0.5 shrink-0">
                        {file.type === 'POSTGRESQL' ? (
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                            <Database className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                        ) : file.type === 'JSON' ? (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                            <FileCode className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                            <FolderArchive className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                        )}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-200 truncate font-mono text-[11px]">{file.filename}</p>
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                              file.type === 'POSTGRESQL'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : file.type === 'JSON'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}
                          >
                            {file.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {file.sizeFormatted} • Criado em {file.createdAt}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons per file */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleDownloadFile(file.filename)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition"
                        title="Baixar para seu Computador"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Baixar</span>
                      </button>

                      <button
                        onClick={() => setConfirmRestoreFile(file)}
                        className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/60 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition"
                        title="Restaurar este backup no servidor"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                        <span>Restaurar</span>
                      </button>

                      <button
                        onClick={() => handleDeleteFile(file.filename)}
                        className="p-1.5 hover:bg-red-950/50 text-slate-500 hover:text-red-400 rounded-lg transition"
                        title="Excluir do Servidor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Arquivos salvos no diretório da VPS: <code className="font-mono text-slate-300">/var/www/centralitl.../backups</code>. É possível baixar qualquer arquivo ou restaurar instantaneamente com 1 clique.
            </span>
          </div>
        </div>
      </div>

      {/* RESTORE MODAL (JSON or PostgreSQL) */}
      {restoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Restauração de Backup do Sistema
                </h3>
              </div>
              <button
                onClick={() => {
                  setRestoreModalOpen(false);
                  setRestoreFile(null);
                  setRestoreText('');
                  setRestorePreview(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setRestoreTab('JSON');
                  setRestoreFile(null);
                  setRestoreText('');
                  setRestorePreview(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                  restoreTab === 'JSON'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Arquivo de Estado (.JSON)</span>
              </button>

              <button
                onClick={() => {
                  setRestoreTab('POSTGRESQL');
                  setRestoreFile(null);
                  setRestoreText('');
                  setRestorePreview(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                  restoreTab === 'POSTGRESQL'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Banco PostgreSQL (.SQL)</span>
              </button>
            </div>

            {/* File Upload Box */}
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 bg-slate-950/60 rounded-xl p-6 text-center cursor-pointer transition space-y-2"
              >
                <Upload className="w-8 h-8 text-purple-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">
                  {restoreFile ? (
                    <span className="text-purple-300 font-mono">{restoreFile.name}</span>
                  ) : (
                    <span>Clique aqui ou arraste o arquivo {restoreTab === 'JSON' ? '.json' : '.sql'} para restaurar</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500">
                  {restoreTab === 'JSON'
                    ? 'Compatível com backups exportados da Central ITL (itl_backup_store...json)'
                    : 'Compatível com scripts de dump PostgreSQL (itl_postgres_backup...sql)'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={restoreTab === 'JSON' ? '.json,application/json' : '.sql,application/sql,text/plain'}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Paste Text Fallback */}
              <div>
                <details className="text-xs text-slate-400">
                  <summary className="cursor-pointer hover:text-slate-200 font-medium">
                    Ou cole o conteúdo {restoreTab === 'JSON' ? 'JSON' : 'SQL'} diretamente:
                  </summary>
                  <textarea
                    rows={4}
                    value={restoreText}
                    onChange={(e) => {
                      setRestoreText(e.target.value);
                      analyzeContent(e.target.value, restoreTab);
                    }}
                    placeholder={
                      restoreTab === 'JSON'
                        ? 'Cole o JSON aqui { "cameras": [...], ... }'
                        : 'Cole o script SQL aqui: CREATE TABLE IF NOT EXISTS ... INSERT INTO ...'
                    }
                    className="w-full mt-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono p-2.5 rounded-xl outline-none focus:border-purple-500"
                  />
                </details>
              </div>

              {/* Analysis / Validation Preview */}
              {restorePreview && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-2 ${
                    restorePreview.valid
                      ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                      : 'bg-red-950/40 border-red-500/40 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {restorePreview.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{restorePreview.summary}</span>
                  </div>

                  {restorePreview.stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                      {Object.entries(restorePreview.stats).map(([k, v]) => (
                        <div key={k} className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">{k}:</span>
                          <span className="font-bold text-slate-100">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Safety notice */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Ponto de Restauração de Segurança Automático:
                </p>
                <p>
                  Antes de aplicar qualquer alteração, o servidor salvará automaticamente uma cópia snapshot do estado atual em <code className="font-mono text-slate-300">/backups/safety_before_restore...</code> para que você nunca perca dados.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setRestoreModalOpen(false);
                  setRestoreFile(null);
                  setRestoreText('');
                  setRestorePreview(null);
                }}
                disabled={isRestoring}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>

              <button
                onClick={handleExecuteRestore}
                disabled={!restorePreview?.valid || isRestoring}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restaurando Dados...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Restaurar Backup</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESTORE FOR STORED FILE MODAL */}
      {confirmRestoreFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Confirmar Restauração no Servidor</h3>
                <p className="text-xs text-slate-400">Você selecionou restaurar o backup abaixo:</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
              <div className="text-purple-300 font-bold truncate">{confirmRestoreFile.filename}</div>
              <div className="text-slate-400 text-[11px]">
                Tipo: <span className="text-slate-200">{confirmRestoreFile.type}</span> • Tamanho:{' '}
                <span className="text-slate-200">{confirmRestoreFile.sizeFormatted}</span>
              </div>
              <div className="text-slate-400 text-[11px]">Data: {confirmRestoreFile.createdAt}</div>
            </div>

            <p className="text-xs text-slate-300">
              O sistema irá carregar as câmeras, usuários, gravações e planos contidos neste arquivo de backup. Uma cópia de segurança automática será criada antes da substituição.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setConfirmRestoreFile(null)}
                disabled={isRestoring}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExecuteStoredFileRestore(confirmRestoreFile)}
                disabled={isRestoring}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restaurando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Restaurar Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
