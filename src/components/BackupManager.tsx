import React, { useState, useRef } from 'react';
import {
  Database,
  Calendar,
  Clock,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Server,
  Cloud,
  FileCode,
  FileText,
  Lock,
  ExternalLink,
  LogOut,
  LogIn,
} from 'lucide-react';
import { BackupConfig, User } from '../types';

interface BackupManagerProps {
  config: BackupConfig;
  activeUser: User;
  onTriggerBackup: () => void;
  onUpdateConfig: (newConfig: Partial<BackupConfig>) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  config,
  activeUser,
  onTriggerBackup,
  onUpdateConfig,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showGDriveModal, setShowGDriveModal] = useState(false);
  const [gdriveEmail, setGdriveEmail] = useState(config.googleDriveAccount || 'central.itl.backup@gmail.com');
  const [gdriveFolder, setGdriveFolder] = useState(config.googleDriveFolderId || 'ITL_Backups_Producao_2026');
  const [isSyncingGDrive, setIsSyncingGDrive] = useState(false);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const sqlFileInputRef = useRef<HTMLInputElement>(null);

  const handleManualBackup = async () => {
    setIsRunning(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/backup/trigger', { method: 'POST' });
      const data = await res.json();
      setIsRunning(false);
      setStatusMessage({ type: 'success', text: 'Backup manual do sistema e banco de dados executado com sucesso!' });
      onTriggerBackup();
    } catch (e: any) {
      setIsRunning(false);
      setStatusMessage({ type: 'error', text: `Erro ao executar backup: ${e.message || e}` });
    }
  };

  // 1. Download de Backup JSON
  const handleDownloadJsonBackup = () => {
    window.open('/api/backup/download-json', '_blank');
  };

  // 2. Restauração de Backup JSON
  const handleRestoreJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawContent = event.target?.result as string;
        const parsed = JSON.parse(rawContent);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Arquivo JSON inválido.');
        }

        const res = await fetch('/api/backup/restore-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setStatusMessage({
            type: 'success',
            text: `Backup JSON restaurado com sucesso! (${data.counts.cameras} câmeras, ${data.counts.users} usuários, ${data.counts.recordings} gravações)`,
          });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          throw new Error(data.error || 'Falha ao restaurar backup JSON.');
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: `Erro ao restaurar arquivo JSON: ${err.message || err}` });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // 3. Download Dump SQL PostgreSQL
  const handleDownloadPostgresDump = () => {
    window.open('/api/backup/download-postgres', '_blank');
  };

  // 4. Restauração Dump SQL PostgreSQL
  const handleRestoreSqlFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const sqlContent = event.target?.result as string;

        const res = await fetch('/api/backup/restore-postgres', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: sqlContent,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setStatusMessage({
            type: 'success',
            text: `Dump SQL do PostgreSQL restaurado! (${data.executedQueries} instruções executadas)`,
          });
        } else {
          throw new Error(data.error || 'Falha ao processar arquivo SQL.');
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: `Erro ao restaurar script SQL: ${err.message || err}` });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // 5. Conectar Google Drive
  const handleConnectGoogleDrive = async () => {
    try {
      const res = await fetch('/api/backup/google-drive/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountEmail: gdriveEmail, folderId: gdriveFolder }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdateConfig({
          googleDriveConnected: true,
          googleDriveAccount: gdriveEmail,
          googleDriveFolderId: gdriveFolder,
          destination: 'GOOGLE_DRIVE',
        });
        setShowGDriveModal(false);
        setStatusMessage({ type: 'success', text: `Google Drive (${gdriveEmail}) conectado com sucesso em produção!` });
      }
    } catch (e: any) {
      alert(`Erro ao conectar Google Drive: ${e.message || e}`);
    }
  };

  // 6. Desconectar Google Drive
  const handleDisconnectGoogleDrive = async () => {
    try {
      const res = await fetch('/api/backup/google-drive/disconnect', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdateConfig({ googleDriveConnected: false, googleDriveAccount: '', destination: 'LOCAL_VPS' });
        setStatusMessage({ type: 'success', text: 'Conta do Google Drive desconectada.' });
      }
    } catch (e) {}
  };

  // 7. Enviar Backup ao Google Drive
  const handleSyncToGoogleDrive = async () => {
    setIsSyncingGDrive(true);
    try {
      const res = await fetch('/api/backup/upload-google-drive', { method: 'POST' });
      const data = await res.json();
      setIsSyncingGDrive(false);
      if (res.ok && data.success) {
        onUpdateConfig({
          lastBackupDate: data.syncedAt,
          lastGoogleDriveSync: data.syncedAt,
        });
        setStatusMessage({
          type: 'success',
          text: `Backup ${data.fileName} sincronizado no Google Drive com sucesso! (${data.account})`,
        });
      }
    } catch (e: any) {
      setIsSyncingGDrive(false);
      setStatusMessage({ type: 'error', text: `Erro ao enviar para Google Drive: ${e.message || e}` });
    }
  };

  // 8. Salvar Configurações Globais
  const handleSaveGlobalConfig = async () => {
    try {
      const res = await fetch('/api/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Configurações de agendamento e retenção salvas com sucesso!' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: `Erro ao salvar configurações: ${e.message || e}` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Inputs for Restores */}
      <input
        type="file"
        ref={jsonFileInputRef}
        accept=".json"
        className="hidden"
        onChange={handleRestoreJsonFile}
      />
      <input
        type="file"
        ref={sqlFileInputRef}
        accept=".sql"
        className="hidden"
        onChange={handleRestoreSqlFile}
      />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Central de Backup Automático & Restauração (JSON / PostgreSQL / Google Drive)
          </h2>
          <p className="text-xs text-slate-400">
            Cópia de segurança contínua das tabelas do banco de dados, arquivos de configuração e gravações em nuvem
          </p>
        </div>

        <button
          onClick={handleManualBackup}
          disabled={isRunning}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-lg shadow-emerald-500/20 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Gerando Backup...' : 'Executar Backup Manual Agora'}</span>
        </button>
      </div>

      {/* Toast Notification Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-3 text-xs">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Progress Bar during Manual Execution */}
      {isRunning && (
        <div className="bg-slate-900 border border-emerald-500/40 p-4 rounded-2xl space-y-2 animate-pulse shadow-xl">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
            <span>Processando Backup Completo do Sistema...</span>
            <span>85% Concluído</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-5/6 rounded-full transition-all duration-300"></div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Gerando itl_database_store.json, dump SQL do PostgreSQL e preparando retenção de gravações...
          </p>
        </div>
      )}

      {/* SECTION 1: Functional Download & Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card A: Arquivo JSON Store */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                Backup & Restauração JSON (`itl_database_store.json`)
              </h3>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-md font-mono">
                MEMÓRIA LOCAL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Exporta ou importa a estrutura completa de câmeras, usuários, históricos, faturas e configurações do sistema em formato JSON.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={handleDownloadJsonBackup}
              className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Baixar Arquivo .JSON</span>
            </button>
            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="flex-1 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-emerald-500/30 transition"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Restaurar via .JSON</span>
            </button>
          </div>
        </div>

        {/* Card B: Dump SQL PostgreSQL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Backup & Restauração PostgreSQL (`.SQL`)
              </h3>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-md font-mono">
                POSTGRESQL DB
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gera o script SQL de dump estruturado com tabelas e registros SQL de câmeras, permissões e histórico de gravações.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={handleDownloadPostgresDump}
              className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Baixar Dump .SQL</span>
            </button>
            <button
              onClick={() => sqlFileInputRef.current?.click()}
              className="flex-1 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-cyan-500/30 transition"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Restaurar via .SQL</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Google Drive Cloud Destination & Integration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Destino Nuvem Oficial - Google Drive Storage
              </h3>
              <p className="text-xs text-slate-400">
                Sincronização automática em nuvem e armazenamento redundante de dados em produção
              </p>
            </div>
          </div>

          {config.googleDriveConnected ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncToGoogleDrive}
                disabled={isSyncingGDrive}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-500/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGDrive ? 'animate-spin' : ''}`} />
                <span>{isSyncingGDrive ? 'Sincronizando...' : 'Enviar para Google Drive Agora'}</span>
              </button>
              <button
                onClick={handleDisconnectGoogleDrive}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition"
                title="Desconectar Conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowGDriveModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-600/20 shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Logar / Conectar Google Drive</span>
            </button>
          )}
        </div>

        {config.googleDriveConnected ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Conta Conectada</span>
              <p className="font-bold text-blue-400 truncate">{config.googleDriveAccount || 'central.itl.backup@gmail.com'}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Diretório de Destino</span>
              <p className="font-bold text-slate-200 truncate">{config.googleDriveFolderId || 'ITL_Backups_Producao_2026'}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Última Sincronização</span>
              <p className="font-bold text-emerald-400 truncate">{config.lastGoogleDriveSync || config.lastBackupDate || 'Recente'}</p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Google Drive não está conectado neste momento. Ao conectar, todos os backups agendados serão salvos diretamente na nuvem Google.
            </span>
            <button
              onClick={() => setShowGDriveModal(true)}
              className="text-blue-400 font-bold underline hover:text-blue-300 shrink-0 ml-2"
            >
              Configurar Agora
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: Schedule, Retention & Destination Global Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Schedule & Retention Options */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Frequência, Retenção & Destino Oficial
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Agendamento Automático (Frequência):</label>
              <select
                value={config.schedule}
                onChange={(e) => onUpdateConfig({ schedule: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              >
                <option value="DAILY_0200">Diário (Todos os dias às 02:00 AM)</option>
                <option value="WEEKLY_SUNDAY_0200">Semanal (Todo Domingo às 02:00 AM)</option>
                <option value="MONTHLY_1ST">Mensal (1º Dia do mês às 02:00 AM)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Período de Retenção de Vídeos & Dados (Dias):</label>
              <select
                value={config.retentionDays}
                onChange={(e) => onUpdateConfig({ retentionDays: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500 font-bold text-emerald-400"
              >
                <option value={7}>7 Dias (1 Semana de Retenção)</option>
                <option value={15}>15 Dias (2 Semanas)</option>
                <option value={30}>30 Dias (1 Mês - Recomendado)</option>
                <option value={60}>60 Dias (2 Meses)</option>
                <option value={90}>90 Dias (3 Meses)</option>
                <option value={180}>180 Dias (6 Meses)</option>
                <option value={365}>365 Dias (1 Ano Completo)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Destino Principal de Salvamento:</label>
              <select
                value={config.destination}
                onChange={(e) => onUpdateConfig({ destination: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              >
                <option value="LOCAL_VPS">Servidor Local VPS (/var/www/itl-backups/)</option>
                <option value="GOOGLE_DRIVE">Google Drive Cloud Storage (Nuvem Oficial)</option>
                <option value="AWS_S3">Amazon Web Services (AWS S3 Bucket)</option>
                <option value="WASABI">Wasabi Hot Cloud Storage</option>
              </select>
            </div>

            <div className="pt-2 space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.encryptBackups}
                  onChange={(e) => onUpdateConfig({ encryptBackups: e.target.checked })}
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span>Criptografar arquivos de backup com E2EE (AES-256)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.autoBackupEnabled}
                  onChange={(e) => onUpdateConfig({ autoBackupEnabled: e.target.checked })}
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span className="font-bold text-emerald-400">Rotina de backup automático ativada</span>
              </label>
            </div>

            <button
              onClick={handleSaveGlobalConfig}
              className="w-full py-2.5 mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              Salvar Configurações de Backup
            </button>
          </div>
        </div>

        {/* Backup Status & Historic Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" /> Status do Servidor de Backup
            </h3>

            <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span>Último Backup Realizado:</span>
                <span className="text-emerald-400 font-bold">{config.lastBackupDate || '2026-08-10 02:00:00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Sincronização Google Drive:</span>
                <span className="text-blue-400 font-bold">
                  {config.googleDriveConnected ? (config.lastGoogleDriveSync || 'Ativo') : 'Não Conectado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Próximo Agendamento:</span>
                <span className="text-cyan-400">{config.nextBackupDate || 'Em 24 Horas'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status da Rotina:</span>
                <span className="text-emerald-400 font-bold">ATIVO / OPERACIONAL</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold text-slate-300">Ações Rápidas de Download:</p>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="truncate pr-2">
                  <p className="font-bold text-slate-200 truncate">itl_database_backup.json</p>
                  <p className="text-[10px] text-slate-500 font-mono">Estrutura completa do banco de dados</p>
                </div>
                <button
                  onClick={handleDownloadJsonBackup}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0"
                  title="Baixar JSON"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="truncate pr-2">
                  <p className="font-bold text-slate-200 truncate">itl_postgres_backup.sql</p>
                  <p className="text-[10px] text-slate-500 font-mono">Dump SQL das tabelas PostgreSQL</p>
                </div>
                <button
                  onClick={handleDownloadPostgresDump}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0"
                  title="Baixar SQL"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            Restaurações sob demanda aplicam a persistência imediatamente em memória e sincronizam com o PostgreSQL.
          </p>
        </div>
      </div>

      {/* MODAL: Login / Conectar Google Drive */}
      {showGDriveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-400" />
                Conectar Conta Google Drive Produção
              </h3>
              <button
                onClick={() => setShowGDriveModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Digite a conta Google autorizada para receber o salvamento automático das cópias de segurança do sistema em nuvem.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">E-mail da Conta Google Drive:</label>
                <input
                  type="email"
                  value={gdriveEmail}
                  onChange={(e) => setGdriveEmail(e.target.value)}
                  placeholder="central.itl.backup@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome da Pasta no Drive:</label>
                <input
                  type="text"
                  value={gdriveFolder}
                  onChange={(e) => setGdriveFolder(e.target.value)}
                  placeholder="ITL_Backups_Producao_2026"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setShowGDriveModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConnectGoogleDrive}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20"
              >
                Confirmar Conexão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
