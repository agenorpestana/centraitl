import React, { useState, useEffect } from 'react';
import {
  Server,
  HardDrive,
  ShieldCheck,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Video,
  Key,
  Trash2,
  Lock,
  Wifi,
  WifiOff,
  Archive,
  FileCode,
  Terminal,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { DvrAgent, User } from '../types';
import { getAuthHeaders } from '../lib/security';

interface DvrAgentManagerProps {
  currentUser: User;
}

interface InstallerInfo {
  isAvailable: boolean;
  version: string;
  fileName: string;
  downloadUrl: string;
  serverUrl: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256?: string;
  generatedAt?: string;
}

export const DvrAgentManager: React.FC<DvrAgentManagerProps> = ({ currentUser }) => {
  const [subTab, setSubTab] = useState<'agents' | 'installer'>('installer');
  const [agents, setAgents] = useState<DvrAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Installer State
  const [installerInfo, setInstallerInfo] = useState<InstallerInfo | null>(null);
  const [installerLoading, setInstallerLoading] = useState<boolean>(false);
  const [customServerUrl, setCustomServerUrl] = useState<string>('');
  const [generatingPackage, setGeneratingPackage] = useState<boolean>(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/dvr-agents', {
        headers: getAuthHeaders(currentUser),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar lista de DVR Agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallerInfo = async () => {
    setInstallerLoading(true);
    try {
      const res = await fetch('/api/v1/dvr-agents/installer/info');
      if (res.ok) {
        const data: InstallerInfo = await res.json();
        setInstallerInfo(data);
        if (!customServerUrl && data.serverUrl) {
          setCustomServerUrl(data.serverUrl);
        }
      }
    } catch (e) {
    } finally {
      setInstallerLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchInstallerInfo();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRevoke = async (agentId: string) => {
    if (!window.confirm('Tem certeza de que deseja revogar o token deste agente DVR? O dispositivo não conseguirá mais enviar heartbeats nem sincronizar até ser re-autenticado.')) {
      return;
    }

    setRevokingId(agentId);
    try {
      const res = await fetch(`/api/v1/dvr-agents/${agentId}/revoke`, {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAgents();
    } catch (err: any) {
      alert(`Falha ao revogar agente: ${err.message}`);
    } finally {
      setRevokingId(null);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!window.confirm('Excluir este agente da Central? As gravações existentes no computador do cliente NUNCA serão apagadas.')) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/dvr-agents/${agentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAgents();
    } catch (err: any) {
      alert(`Falha ao excluir agente: ${err.message}`);
    }
  };

  const handleGeneratePackage = async () => {
    setGeneratingPackage(true);
    setGenerateMessage(null);
    try {
      const res = await fetch('/api/v1/dvr-agents/installer/generate', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(currentUser),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverUrl: customServerUrl || window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setGenerateMessage('✔ Pacote compilado e atualizado com sucesso!');
      await fetchInstallerInfo();
    } catch (err: any) {
      setGenerateMessage(`Erro: ${err.message}`);
    } finally {
      setGeneratingPackage(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="space-y-6" id="dvr-agent-manager-panel">
      {/* Header com Navegação em Abas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                DVR Agent Desktop (Windows x64)
              </h2>
              <p className="text-sm text-slate-400">
                Gravação contínua local em MP4, normalização RTSP/RTMP e instalador pré-configurado com a URL do servidor
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Abas do DVR */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setSubTab('installer')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              subTab === 'installer'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            id="btn-subtab-installer"
          >
            <Download className="w-4 h-4" />
            Instalador Pré-Configurado (.ZIP)
          </button>
          <button
            onClick={() => setSubTab('agents')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              subTab === 'agents'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            id="btn-subtab-agents"
          >
            <Server className="w-4 h-4" />
            Dispositivos Ativos ({agents.length})
          </button>
        </div>
      </div>

      {/* ABA: INSTALADOR PRÉ-CONFIGURADO */}
      {subTab === 'installer' && (
        <div className="space-y-6">
          {/* Card Principal de Download */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 border border-slate-800 rounded-xl p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-800">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Pronto para Download & Instalação
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Pacote do Instalador DVR Windows
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Gerado automaticamente durante o comando <code className="text-emerald-400 font-mono">./install.sh</code>.
                  O pacote já contém todas as configurações do servidor, a URL de conexão e os scripts de inicialização automática.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <a
                  href="/api/v1/dvr-agents/installer/download-zip"
                  className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-base font-bold rounded-xl shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
                  id="btn-download-full-zip"
                  download="itl-dvr-agent-windows.zip"
                >
                  <Archive className="w-5 h-5" />
                  Baixar Pacote Completo (.ZIP)
                </a>

                <a
                  href="/api/v1/dvr-agents/installer/download-config"
                  className="flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition"
                  id="btn-download-config-json"
                  download="dvr-config.json"
                >
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  Baixar dvr-config.json
                </a>
              </div>
            </div>

            {/* Informações de Compilação e URL Configurada */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg">
                <div className="text-xs text-slate-400 font-medium">URL Conectada da Central</div>
                <div className="text-sm font-mono text-blue-400 font-bold mt-1 break-all">
                  {installerInfo?.serverUrl || window.location.origin}
                </div>
                <div className="text-xs text-slate-500 mt-1">Configurada no script install.sh</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg">
                <div className="text-xs text-slate-400 font-medium">Tamanho do Arquivo & Versão</div>
                <div className="text-sm font-semibold text-slate-200 mt-1">
                  {installerInfo?.sizeFormatted || '24 KB'} (v{installerInfo?.version || '1.0.0'})
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Gerado em: {installerInfo?.generatedAt ? new Date(installerInfo.generatedAt).toLocaleString() : 'Recente'}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg">
                <div className="text-xs text-slate-400 font-medium">Compatibilidade de Vídeo</div>
                <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> RTSP H.264 & RTMP Nativo
                </div>
                <div className="text-xs text-slate-500 mt-1">Gravação direta em MP4 sem navegador</div>
              </div>
            </div>
          </div>

          {/* Guia Passo a Passo de Instalação no Cliente Windows */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-400" />
              Como Instalar e Rodar no Computador Windows do Cliente
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg relative space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                  1
                </div>
                <h5 className="font-semibold text-slate-200 text-sm">Baixar o Arquivo</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Clique no botão acima para baixar o arquivo compactado <code className="text-blue-300 font-mono">itl-dvr-agent-windows.zip</code>.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg relative space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                  2
                </div>
                <h5 className="font-semibold text-slate-200 text-sm">Extrair no Windows</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Descompacte a pasta em um local de sua preferência no computador, por exemplo: <code className="text-blue-300 font-mono">C:\ITL-DVR-Agent</code>.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg relative space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                  3
                </div>
                <h5 className="font-semibold text-slate-200 text-sm">Executar o DVR</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dê duplo clique no script <code className="text-emerald-300 font-mono">iniciar-dvr.bat</code> ou <code className="text-blue-300 font-mono">instalar-inicializacao-automatica.bat</code>.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg relative space-y-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  4
                </div>
                <h5 className="font-semibold text-slate-200 text-sm">Conexão Imediata</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  A URL da Central já vem preenchida. Faça login com seu usuário do painel e o agente iniciará as gravações locais!
                </p>
              </div>
            </div>
          </div>

          {/* Painel do Administrador: Recompilar com Nova URL Personalizada */}
          {currentUser.role === 'ADMIN' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Reconfigurar URL do Instalador (Gerador Dinâmico)
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Se você alterar o domínio, IP fixo ou rota Nginx do servidor, digite a nova URL abaixo para recompilar o pacote zipado com a nova configuração.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  placeholder="https://monitoramento.seudominio.com"
                  className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  id="input-custom-server-url"
                />
                <button
                  onClick={handleGeneratePackage}
                  disabled={generatingPackage}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition shrink-0"
                  id="btn-recompile-package"
                >
                  <RefreshCw className={`w-4 h-4 ${generatingPackage ? 'animate-spin' : ''}`} />
                  {generatingPackage ? 'Recompilando Pacote...' : 'Recompilar com Esta URL'}
                </button>
              </div>

              {generateMessage && (
                <div className={`p-3 rounded-lg text-xs font-medium ${
                  generateMessage.startsWith('✔')
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950/40 text-red-400 border border-red-800'
                }`}>
                  {generateMessage}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA: DISPOSITIVOS & MONITORAMENTO */}
      {subTab === 'agents' && (
        <div className="space-y-6">
          {/* Grid de Métricas Globais dos Agentes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agentes Operacionais</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {agents.filter((a) => a.status === 'ONLINE').length} / {agents.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Instalações em clientes</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Espaço em Disco Somado</div>
              <div className="text-2xl font-bold text-blue-400 mt-1">
                {agents.reduce((acc, a) => acc + (a.diskFreeGB || 0), 0)} GB
              </div>
              <div className="text-xs text-slate-500 mt-1">Livre para retenção nos computadores</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Câmeras Gerenciadas</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {agents.reduce((acc, a) => acc + (a.camerasStatus ? a.camerasStatus.length : 0), 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Fluxos gravando em borda local</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Segurança das Credenciais</div>
              <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-2">
                <Lock className="w-5 h-5" /> Windows DPAPI
              </div>
              <div className="text-xs text-slate-500 mt-1">Sem senhas em texto puro</div>
            </div>
          </div>

          {/* Lista de Agentes Registrados */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                Instalações Registradas de DVR Local
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAgents}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
                  id="btn-refresh-agents-list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
                <span className="text-xs text-slate-400 font-mono">
                  {agents.length} dispositivo(s) cadastrado(s)
                </span>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border-b border-red-800 text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {agents.length === 0 && !loading ? (
              <div className="p-12 text-center">
                <Server className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h4 className="text-base font-medium text-slate-300">Nenhum Agente DVR Desktop conectado ainda</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Instale o ITL DVR Agent no computador Windows do cliente. Ele gravará as câmeras continuamente mesmo com o navegador fechado.
                </p>
                <button
                  onClick={() => setSubTab('installer')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/20"
                >
                  <Download className="w-4 h-4" />
                  Ir para Download do Instalador
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {agents.map((agent) => (
                  <div key={agent.id} className="p-5 hover:bg-slate-800/30 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white text-base">{agent.name}</span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            agent.status === 'ONLINE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : agent.status === 'REVOKED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {agent.status === 'ONLINE' ? (
                            <>
                              <Wifi className="w-3 h-3" /> ONLINE
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3 h-3" /> {agent.status}
                            </>
                          )}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">v{agent.version || '1.0.0'}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>Host: <strong className="text-slate-300">{agent.hostname || 'Windows'}</strong></span>
                        <span>OS: <strong className="text-slate-300">{agent.os || 'Windows x64'}</strong></span>
                        <span>DeviceId: <code className="bg-slate-800 px-1 py-0.5 rounded text-blue-300">{agent.deviceId}</code></span>
                        <span>Último Contato: <strong className="text-slate-300">{agent.lastSeen ? new Date(agent.lastSeen).toLocaleTimeString() : 'N/A'}</strong></span>
                      </div>

                      {/* Informações de Disco e Retenção */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                          Disco: <strong className="text-slate-200">{agent.diskFreeGB} GB livres</strong> (Total {agent.diskTotalGB} GB)
                        </span>
                        <span>
                          Retenção Máx: <strong className="text-slate-200">{agent.retentionDays} dias</strong> / <strong className="text-slate-200">{agent.storageLimitGB} GB (FIFO)</strong>
                        </span>
                      </div>

                      {/* Câmeras ativas neste agente */}
                      {agent.camerasStatus && agent.camerasStatus.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {agent.camerasStatus.map((c) => (
                            <span
                              key={c.cameraId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700"
                            >
                              <Video className="w-3 h-3 text-blue-400" />
                              {c.cameraId} ({c.status})
                              {c.isRecording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {agent.status !== 'REVOKED' && (
                        <button
                          onClick={() => handleRevoke(agent.id)}
                          disabled={revokingId === agent.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 text-xs font-medium rounded-lg border border-amber-700/50 transition"
                          title="Revogar token deste dispositivo"
                        >
                          <Key className="w-3.5 h-3.5" />
                          Revogar Acesso
                        </button>
                      )}

                      {currentUser.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(agent.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                          title="Remover agente da Central"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dicas e Práticas Operacionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle className="w-4 h-4" />
                Gravação Contínua Sem Navegador
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                O DVR Agent roda como processo nativo do Windows em background. Mesmo se todas as janelas forem fechadas ou se houver oscilação de tela, as câmeras continuarão gravando ininterruptamente.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                Cofre DPAPI & Sem Senhas em Texto Puro
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Após o login inicial, as credenciais são criptografadas pelo Windows Credential Manager. A senha do usuário é descartada e o token de hardware é revogável a qualquer instante pelo painel.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <RefreshCw className="w-4 h-4" />
                Watchdog com Backoff Exponencial
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Processos FFmpeg isolados por câmera. Se um cabo de rede for desconectado ou a câmera reiniciar, as outras câmeras continuam gravando normalmente enquanto o agente tenta reconectar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
