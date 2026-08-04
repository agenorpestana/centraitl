import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Terminal,
  Settings,
  Layers,
  Cpu,
  Copy,
  Trash2,
  Zap,
} from 'lucide-react';
import { User } from '../types';

interface DatabaseDiagnosticsPanelProps {
  activeUser?: User;
}

interface DbStatusResponse {
  isPgActive: boolean;
  dbName: string;
  host?: string;
  port?: number;
  user?: string;
  status: string;
  memoryCounts: {
    cameras: number;
    users: number;
    recordings: number;
    logs: number;
    plans: number;
    invoices: number;
  };
  postgresCounts: {
    cameras: number;
    users: number;
    recordings: number;
    logs: number;
    plans: number;
    invoices: number;
  };
}

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  timeMs?: number;
  details?: any;
}

export const DatabaseDiagnosticsPanel: React.FC<DatabaseDiagnosticsPanelProps> = () => {
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Config Form state
  const [config, setConfig] = useState({
    dbHost: '127.0.0.1',
    dbPort: 5432,
    dbName: 'itl_cameras',
    dbUser: 'itl_user',
    dbPassword: 'itl_pass_2026',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setConsoleLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const fetchDbStatus = async () => {
    setLoadingStatus(true);
    addLog('Solicitando status do banco de dados PostgreSQL...');
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data: DbStatusResponse = await res.json();
        setDbStatus(data);
        if (data.host) setConfig((prev) => ({ ...prev, dbHost: data.host || prev.dbHost, dbPort: data.port || prev.dbPort, dbName: data.dbName || prev.dbName, dbUser: data.user || prev.dbUser }));
        addLog(`Status obtido: ${data.status} (${data.isPgActive ? 'Conectado no Postgres' : 'Modo Backup JSON Local'})`);
      } else {
        addLog(`Erro ao obter status: HTTP ${res.status}`);
      }
    } catch (err: any) {
      addLog(`Falha na requisição /api/db-status: ${err.message || err}`);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const runDatabaseDiagnostics = async () => {
    setIsRunningTest(true);
    setTestResults([]);
    addLog('=== INICIANDO SUÍTE COMPLETA DE DIAGNÓSTICO DO BANCO DE DADOS ===');

    try {
      const startTime = performance.now();
      const res = await fetch('/api/db-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tests)) {
          setTestResults(data.tests);
          data.tests.forEach((t: TestResult) => {
            addLog(`[${t.success ? 'OK' : 'ERRO'}] ${t.step}: ${t.message} (${t.timeMs || 0}ms)`);
          });
        }
        addLog(`Diagnóstico concluído em ${elapsed}ms. Status geral: ${data.success ? 'SUCESSO' : 'ATENÇÃO'}`);
      } else {
        const errorText = await res.text();
        addLog(`[ERRO HTTP ${res.status}] Falha ao executar /api/db-test: ${errorText}`);
        setTestResults([
          {
            step: 'Conexão HTTP Backend',
            success: false,
            message: `Servidor retornou código de erro HTTP ${res.status}`,
            timeMs: elapsed,
          },
        ]);
      }
    } catch (err: any) {
      addLog(`[FALHA FATAL] Não foi possível conectar ao endpoint de teste: ${err.message || err}`);
      setTestResults([
        {
          step: 'Comunicação com Servidor',
          success: false,
          message: err.message || 'Erro de rede/gateway ao tentar testar o banco de dados',
        },
      ]);
    } finally {
      setIsRunningTest(false);
      fetchDbStatus();
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    addLog('Iniciando sincronização forçada das tabelas de memória para o PostgreSQL...');
    try {
      const res = await fetch('/api/db-sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addLog(`[SUCESSO] ${data.message}`);
      } else {
        addLog(`[ERRO SINCRONIZAÇÃO] ${data.message || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      addLog(`[ERRO] Falha ao enviar requisição /api/db-sync: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
      fetchDbStatus();
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigMessage(null);
    addLog(`Atualizando parâmetros do PostgreSQL: ${config.dbUser}@${config.dbHost}:${config.dbPort}/${config.dbName}...`);

    try {
      const res = await fetch('/api/db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfigMessage({ type: 'success', text: data.message || 'Configuração salva e conexão estabelecida!' });
        addLog(`[SUCESSO] Conexão com PostgreSQL estabelecida no host ${config.dbHost}:${config.dbPort}`);
        fetchDbStatus();
      } else {
        setConfigMessage({ type: 'error', text: data.error || 'Erro ao conectar com as credenciais informadas.' });
        addLog(`[ERRO PG CONFIG] ${data.error || 'Credenciais inválidas ou PostgreSQL inacessível'}`);
      }
    } catch (err: any) {
      setConfigMessage({ type: 'error', text: `Erro de comunicação: ${err.message}` });
      addLog(`[FALHA CONEXÃO] ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Diagnóstico & Teste do Banco de Dados PostgreSQL
              </h1>
              <p className="text-xs text-slate-400">
                Painel para testes de conectividade, leitura/escrita, e configuração em tempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDbStatus}
            disabled={loadingStatus}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>Atualizar Status</span>
          </button>

          <button
            onClick={runDatabaseDiagnostics}
            disabled={isRunningTest}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center space-x-2 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunningTest ? 'Executando Teste...' : 'Executar Diagnóstico'}</span>
          </button>
        </div>
      </div>

      {/* Status Card Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection State */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status PostgreSQL</span>
            {dbStatus?.isPgActive ? (
              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                CONECTADO & ATIVO
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded-full flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                OFFLINE (JSON LOCAL)
              </span>
            )}
          </div>
          <div className="text-2xl font-extrabold text-white">
            {dbStatus?.isPgActive ? 'PostgreSQL Ativo' : 'Banco JSON Local'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Host: <span className="font-mono text-slate-200">{config.dbHost}:{config.dbPort}</span> | BD:{' '}
            <span className="font-mono text-emerald-400">{config.dbName}</span>
          </p>
        </div>

        {/* Database Counts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registros no Postgres</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Câmeras</span>
              <span className="text-base font-bold text-emerald-400">
                {dbStatus?.postgresCounts.cameras ?? 0}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Usuários</span>
              <span className="text-base font-bold text-teal-400">
                {dbStatus?.postgresCounts.users ?? 0}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Gravações</span>
              <span className="text-base font-bold text-cyan-400">
                {dbStatus?.postgresCounts.recordings ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Ações Rápidas</span>
            <p className="text-xs text-slate-400">Sincronize os dados em memória diretamente com as tabelas do PostgreSQL.</p>
          </div>
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="w-full mt-3 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition"
          >
            <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Forçar Sincronização Agora'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Config Form & Diagnostic Test Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Parâmetros de Conexão do PostgreSQL</h2>
          </div>

          {configMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                configMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {configMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>{configMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Host / IP do PostgreSQL</label>
                <input
                  type="text"
                  value={config.dbHost}
                  onChange={(e) => setConfig({ ...config, dbHost: e.target.value })}
                  placeholder="127.0.0.1 ou db.itlfibra.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Porta</label>
                <input
                  type="number"
                  value={config.dbPort}
                  onChange={(e) => setConfig({ ...config, dbPort: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Nome do Banco de Dados</label>
              <input
                type="text"
                value={config.dbName}
                onChange={(e) => setConfig({ ...config, dbName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Usuário DB</label>
                <input
                  type="text"
                  value={config.dbUser}
                  onChange={(e) => setConfig({ ...config, dbUser: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Senha DB</label>
                <input
                  type="password"
                  value={config.dbPassword}
                  onChange={(e) => setConfig({ ...config, dbPassword: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition shadow flex items-center justify-center space-x-2"
              >
                <Server className="w-4 h-4" />
                <span>{savingConfig ? 'Conectando...' : 'Salvar & Testar Conexão PostgreSQL'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Diagnostic Results Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Resultados do Teste de Diagnóstico</h2>
            </div>
            {testResults.length > 0 && (
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                {testResults.filter((t) => t.success).length} / {testResults.length} OK
              </span>
            )}
          </div>

          {testResults.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Database className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-xs text-slate-400">
                Nenhum teste executado ainda. Clique em <span className="text-emerald-400 font-bold">"Executar Diagnóstico"</span> para testar conexão, tabelas, e operações de leitura/escrita.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl border text-xs space-y-1 transition ${
                    test.success
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                      : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-semibold">
                      {test.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{test.step}</span>
                    </div>
                    {test.timeMs !== undefined && (
                      <span className="text-[10px] font-mono text-slate-400">{test.timeMs}ms</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 pl-6">{test.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Terminal Console Logs */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono space-y-3 shadow-inner">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Console de Logs de Conexão do BD
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(consoleLogs.join('\n'));
                addLog('Logs copiados para a área de transferência!');
              }}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Copiar Logs"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConsoleLogs([])}
              className="p-1 text-slate-400 hover:text-rose-400 transition"
              title="Limpar Console"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="h-44 overflow-y-auto space-y-1 text-[11px] text-emerald-400/90 leading-relaxed">
          {consoleLogs.length === 0 ? (
            <span className="text-slate-600 italic">Aguardando eventos...</span>
          ) : (
            consoleLogs.map((log, i) => (
              <div key={i} className={log.includes('[ERRO]') || log.includes('[FALHA]') ? 'text-rose-400' : ''}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
