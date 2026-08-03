import React, { useState } from 'react';
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
  const [backupSuccess, setBackupSuccess] = useState(false);

  const handleManualBackup = () => {
    setIsRunning(true);
    setBackupSuccess(false);
    onTriggerBackup();

    setTimeout(() => {
      setIsRunning(false);
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 4000);
    }, 2500);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Sistema de Backup Automático Semanal em Nuvem / VPS
          </h2>
          <p className="text-xs text-slate-400">
            Cópia de segurança programada das gravações de vídeo, fotos de alertas e tabelas de banco de dados
          </p>
        </div>

        <button
          onClick={handleManualBackup}
          disabled={isRunning}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-lg shadow-emerald-500/20"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Gerando Backup...' : 'Executar Backup Manual Agora'}</span>
        </button>
      </div>

      {/* Progress or Success Bar */}
      {isRunning && (
        <div className="bg-slate-900 border border-emerald-500/40 p-4 rounded-2xl space-y-2 animate-pulse shadow-xl">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
            <span>Processando Backup em Nuvem/VPS...</span>
            <span>68% Concluído</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-2/3 rounded-full transition-all duration-300"></div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Empacotando tabelas MySQL (schema.sql), vídeos H.265 e aplicando criptografia E2EE AES-256...
          </p>
        </div>
      )}

      {backupSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 p-4 rounded-2xl flex items-center space-x-3 shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Backup concluído com sucesso!</p>
            <p className="text-[11px] text-emerald-300">
              Arquivo <code className="font-mono text-white">gabriel_backup_2026.tar.gz</code> salvo com segurança no diretório VPS.
            </p>
          </div>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Schedule & Retention Options */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Frequência e Política de Retenção
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Agendamento Automático:</label>
              <select
                value={config.schedule}
                onChange={(e) => onUpdateConfig({ schedule: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              >
                <option value="WEEKLY_SUNDAY_0200">Semanal (Todo Domingo às 02:00 AM)</option>
                <option value="DAILY_0200">Diário (Todos os dias às 02:00 AM)</option>
                <option value="MONTHLY_1ST">Mensal (1º dia do mês às 02:00 AM)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Período de Retenção de Vídeos:</label>
              <select
                value={config.retentionDays}
                onChange={(e) => onUpdateConfig({ retentionDays: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              >
                <option value={7}>7 Dias (Manter última semana)</option>
                <option value={15}>15 Dias</option>
                <option value={30}>30 Dias (Recomendado)</option>
                <option value={90}>90 Dias (3 meses)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Destino do Backup:</label>
              <select
                value={config.destination}
                onChange={(e) => onUpdateConfig({ destination: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              >
                <option value="LOCAL_VPS">Servidor Local VPS (/var/www/gabriel-backups/)</option>
                <option value="AWS_S3">Amazon Web Services (AWS S3 Bucket)</option>
                <option value="WASABI">Wasabi Hot Cloud Storage</option>
                <option value="GOOGLE_DRIVE">Google Drive Cloud Storage</option>
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
                <span>Backup automático ativado</span>
              </label>
            </div>
          </div>
        </div>

        {/* Backup Status & Historic Files */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" /> Status do Servidor de Backup
            </h3>

            <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span>Último Backup Realizado:</span>
                <span className="text-emerald-400 font-bold">{config.lastBackupDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Próximo Backup Programado:</span>
                <span className="text-cyan-400">{config.nextBackupDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Status da Rotina:</span>
                <span className="text-emerald-400 font-bold">ATIVO / OK</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold text-slate-300">Arquivos Recentes para Download:</p>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="truncate pr-2">
                  <p className="font-bold text-slate-200 truncate">gabriel_backup_2026_07_20.tar.gz</p>
                  <p className="text-[10px] text-slate-500 font-mono">48.2 GB • E2EE Criptografado</p>
                </div>
                <button
                  onClick={() => alert('Iniciando download seguro do arquivo de backup .tar.gz')}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0"
                  title="Baixar Cópia"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            Para restaurar um backup na VPS, utilize a opção de restauração do MySQL ou extraia o arquivo no diretório da aplicação.
          </p>
        </div>
      </div>
    </div>
  );
};
