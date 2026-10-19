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
  Monitor,
  Cloud,
  Play,
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
  mode?: string;
  cloudRecording?: boolean;
}

export const DvrAgentManager: React.FC<DvrAgentManagerProps> = ({ currentUser }) => {
  const [subTab, setSubTab] = useState<'installer' | 'agents'>('installer');
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
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

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
      setError(err.message || 'Erro ao carregar lista de dispositivos DVR');
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
    if (!window.confirm('Tem certeza de que deseja revogar o token deste visualizador DVR?')) {
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
      alert(`Falha ao revogar visualizador: ${err.message}`);
    } finally {
      setRevokingId(null);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!window.confirm('Excluir este dispositivo da Central?')) {
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
      alert(`Falha ao excluir dispositivo: ${err.message}`);
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

  const buildCommands = `# 1. Navegue até o módulo desktop\ncd apps/dvr-desktop\n\n# 2. Instale as dependências\nnpm install\n\n# 3. Compile os fontes TypeScript\nnpm run build\n\n# 4. Gere o instalador executável Windows NSIS\nnpm run package:win`;

  const copyBuildCommands = () => {
    navigator.clipboard.writeText(buildCommands);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-6" id="dvr-agent-manager-panel">
      {/* Header com Navegação em Abas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2.5">
                Visualizador DVR Nativo (Windows x64)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <Cloud className="w-3 h-3" /> Gravação em Nuvem 24h
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Visualizador de monitoramento de alta performance em formato DVR (grades 1x1, 2x2, 3x3, 4x4) sem limitações de conexão do navegador
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
            Download & Como Rodar (.ZIP / .BAT)
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
            Visualizadores Conectados ({agents.length})
          </button>
        </div>
      </div>

      {/* ABA: INSTALADOR & EXECUÇÃO DO VISUALIZADOR */}
      {subTab === 'installer' && (
        <div className="space-y-6">
          {/* Card Principal de Download */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 border border-slate-800 rounded-xl p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-800">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Pronto para Execução no Windows
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Pacote do Visualizador DVR Nativo Windows
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Pré-configurado com a URL da sua Central (<span className="text-blue-400 font-mono font-semibold">{installerInfo?.serverUrl || 'https://centralitl.unityautomacoes.com.br'}</span>).
                  A gravação de todas as câmeras permanece ativa e segura na nuvem. O aplicativo desktop atua como um monitor DVR dedicado sem limites de abas ou conexões do navegador.
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
                  Baixar Pacote (.ZIP)
                </a>

                <a
                  href="/api/v1/dvr-agents/installer/download-config"
                  className="flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition"
                  id="btn-download-config-json"
                  download="dvr-config.json"
                >
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  dvr-config.json
                </a>
              </div>
            </div>

            {/* Informações de Compilação e URL Configurada */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg">
                <div className="text-xs text-slate-400 font-medium">URL Conectada da Central</div>
                <div className="text-sm font-mono text-blue-400 font-bold mt-1 break-all">
                  {installerInfo?.serverUrl || 'https://centralitl.unityautomacoes.com.br'}
                </div>
                <div className="text-xs text-slate-500 mt-1">Conexão pré-configurada</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg">
                <div className="text-xs text-slate-400 font-medium">Gravação & Armazenamento</div>
                <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <Cloud className="w-4 h-4" /> 100% em Nuvem (Central ITL)
                </div>
                <div className="text-xs text-slate-500 mt-1">Nenhum disco local é requerido</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg">
                <div className="text-xs text-slate-400 font-medium">Execução no Windows</div>
                <div className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-400" /> iniciar-dvr.bat
                </div>
                <div className="text-xs text-slate-500 mt-1">Execução imediata com 1 clique</div>
              </div>
            </div>
          </div>

          {/* DUAS FORMAS DE USAR NO WINDOWS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Opção 1: Execução Imediata via iniciar-dvr.bat */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Opção 1: Execução Direta (iniciar-dvr.bat)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ideal para abrir o monitor DVR imediatamente no Windows sem precisar compilar
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <span>Extraia o arquivo <code className="text-blue-300 font-mono">itl-dvr-agent-windows.zip</code> em qualquer pasta (ex: <code className="text-slate-400 font-mono">C:\ITL-DVR</code>).</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <span>Dê um duplo clique no arquivo <code className="text-emerald-300 font-bold font-mono">iniciar-dvr.bat</code>.</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
                  <span>A janela nativa do DVR se abrirá com a URL pré-preenchida. Faça login com seu usuário da Central e o mural de câmeras iniciará na hora!</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Compatível com qualquer versão do Windows 10 e 11 x64.</span>
              </div>
            </div>

            {/* Opção 2: Gerar o Instalador Executável .exe no Windows */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      Opção 2: Gerar Instalador Executável (.exe)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Gera o instalador NSIS (.exe) oficial com atalho no Menu Iniciar e Desktop
                    </p>
                  </div>
                </div>

                <button
                  onClick={copyBuildCommands}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition"
                  title="Copiar comandos"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-300">
                  Dê um duplo clique em <code className="text-blue-300 font-bold font-mono">compilar-instalador-windows.bat</code> ou execute no terminal:
                </p>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto">
                  <div className="text-slate-500"># 1. Navegue até o módulo desktop</div>
                  <div className="text-blue-400">cd apps/dvr-desktop</div>
                  <div className="text-slate-500 mt-2"># 2. Instale as dependências</div>
                  <div className="text-blue-400">npm install</div>
                  <div className="text-slate-500 mt-2"># 3. Compile os fontes TypeScript</div>
                  <div className="text-blue-400">npm run build</div>
                  <div className="text-slate-500 mt-2"># 4. Gere o instalador executável Windows NSIS</div>
                  <div className="text-emerald-400 font-bold">npm run package:win</div>
                </div>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-lg text-xs text-blue-300">
                O arquivo executável <code className="text-white font-mono">ITL-DVR-Agent-Setup-1.0.0.exe</code> será gerado na pasta <code className="text-white font-mono">release\</code>.
              </div>
            </div>
          </div>

          {/* Painel do Administrador: Reconfigurar URL da Central */}
          {currentUser.role === 'ADMIN' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Reconfigurar URL da Central no Pacote
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Caso mude o domínio, rota de proxy ou IP do servidor, digite a nova URL abaixo para recompilar o pacote com a URL atualizada.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  placeholder="https://centralitl.unityautomacoes.com.br"
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
                  {generatingPackage ? 'Recompilando Pacote...' : 'Recompilar Pacote com Esta URL'}
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
          {/* Métricas dos Dispositivos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visualizadores Ativos</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {agents.filter((a) => a.status === 'ONLINE').length} / {agents.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Instalações em clientes</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gravação Contínua</div>
              <div className="text-2xl font-bold text-blue-400 mt-1 flex items-center gap-2">
                <Cloud className="w-5 h-5" /> Ativa em Nuvem
              </div>
              <div className="text-xs text-slate-500 mt-1">Central ITL de Câmeras</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Segurança das Sessões</div>
              <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-2">
                <Lock className="w-5 h-5" /> Windows DPAPI
              </div>
              <div className="text-xs text-slate-500 mt-1">Cofre de credenciais seguro</div>
            </div>
          </div>

          {/* Lista de Visualizadores */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-400" />
                Visualizadores DVR Registrados
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
                  {agents.length} dispositivo(s)
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
                <Monitor className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h4 className="text-base font-medium text-slate-300">Nenhum Visualizador DVR conectado ainda</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Baixe o pacote ZIP e execute o <code className="text-blue-400 font-mono">iniciar-dvr.bat</code> no computador Windows para abrir o monitor nativo.
                </p>
                <button
                  onClick={() => setSubTab('installer')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/20"
                >
                  <Download className="w-4 h-4" />
                  Ir para Download do Pacote
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
                        <span>Último Acesso: <strong className="text-slate-300">{agent.lastSeen ? new Date(agent.lastSeen).toLocaleTimeString() : 'N/A'}</strong></span>
                      </div>
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
                          Revogar
                        </button>
                      )}

                      {currentUser.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(agent.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                          title="Remover dispositivo"
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
        </div>
      )}
    </div>
  );
};
