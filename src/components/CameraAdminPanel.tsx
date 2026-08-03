import React, { useState, useEffect } from 'react';
import { CameraEditModal } from './CameraEditModal';
import {
  PlusCircle,
  Video,
  Radio,
  Lock,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Globe,
  RadioTower,
  Sliders,
  Activity,
  Terminal,
  X,
  AlertTriangle,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { Camera, User } from '../types';

interface CameraAdminPanelProps {
  cameras: Camera[];
  activeUser: User;
  onAddCamera: (cameraData: Partial<Camera>) => void;
  onDeleteCamera: (id: string) => void;
  onUpdateCamera: (id: string, cameraData: Partial<Camera>) => void;
}

interface IbgeUF {
  id: number;
  sigla: string;
  nome: string;
}

interface IbgeCity {
  id: number;
  nome: string;
}

// Fallback state list if IBGE API has network delay
const FALLBACK_UFS = [
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'AM', nome: 'Amazonas' },
];

const cleanDoubleUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  let cleaned = url.replace(/(https?:\/\/[^/]+)(https?:\/\/)/g, '$2');
  cleaned = cleaned.replace(/([^:]\/)\/+/g, '$1');
  return cleaned;
};

export const CameraAdminPanel: React.FC<CameraAdminPanelProps> = ({
  cameras,
  activeUser,
  onAddCamera,
  onDeleteCamera,
  onUpdateCamera,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [protocol, setProtocol] = useState<'RTSP' | 'RTMP'>('RTSP');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);

  // Diagnostic state
  const [testResult, setTestResult] = useState<{
    loading: boolean;
    data?: any;
    error?: string;
  } | null>(null);

  const getCurrentHost = () => {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const h = window.location.hostname;
      if (h && h !== 'localhost' && h !== '127.0.0.1') return h;
    }
    return 'monitoramento.unityautomacoes.com.br';
  };

  const getCurrentProtocol = () => {
    if (typeof window !== 'undefined' && window.location && window.location.protocol) {
      return window.location.protocol;
    }
    return 'https:';
  };

  // Form states
  const [cameraName, setCameraName] = useState('');
  const [streamKey, setStreamKey] = useState(() => `cam_${Math.random().toString(36).substring(2, 8)}`);
  const [rtmpServer, setRtmpServer] = useState(() => `rtmp://${getCurrentHost()}:1935/live`);
  const [rtspUrl, setRtspUrl] = useState('');

  // Update RTMP server automatically when hostname is available
  useEffect(() => {
    const host = getCurrentHost();
    if (host && rtmpServer.includes('localhost') && host !== 'localhost') {
      setRtmpServer(`rtmp://${host}:1935/live`);
    }
  }, []);

  // IBGE States & Cities
  const [ufs, setUfs] = useState<{ sigla: string; nome: string }[]>(FALLBACK_UFS);
  const [selectedUf, setSelectedUf] = useState('BA');
  const [cities, setCities] = useState<IbgeCity[]>([]);
  const [selectedCity, setSelectedCity] = useState('Itamaraju');
  const [loadingCities, setLoadingCities] = useState(false);

  // Coordinates
  const [lat, setLat] = useState('-17.0397');
  const [lng, setLng] = useState('-39.5312');

  // Extra options
  const [motionSensitivity, setMotionSensitivity] = useState(8);
  const [aiDetectionEnabled, setAiDetectionEnabled] = useState(true);
  const [twoWayAudioEnabled, setTwoWayAudioEnabled] = useState(true);
  const [isE2EEEncrypted, setIsE2EEEncrypted] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Load IBGE UFs on mount
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then((res) => res.json())
      .then((data: IbgeUF[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setUfs(data.map((item) => ({ sigla: item.sigla, nome: item.nome })));
        }
      })
      .catch((err) => console.log('IBGE UFs error, using fallbacks:', err));
  }, []);

  // Load IBGE Cities whenever selectedUf changes
  useEffect(() => {
    if (!selectedUf) return;
    setLoadingCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data: IbgeCity[]) => {
        setLoadingCities(false);
        if (Array.isArray(data) && data.length > 0) {
          setCities(data);
          const found = data.find((c) => c.nome.toLowerCase() === selectedCity.toLowerCase());
          if (!found) {
            setSelectedCity(data[0].nome);
          }
        }
      })
      .catch((err) => {
        setLoadingCities(false);
        console.log('IBGE Cities error:', err);
      });
  }, [selectedUf]);

  // Generate random stream key
  const handleGenerateStreamKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStreamKey(`cam_${rand}`);
  };

  const currentHost = getCurrentHost();
  const currentProtocol = getCurrentProtocol();
  const fullRtmpUrl = `${rtmpServer}/${streamKey}`;
  const generatedHttpLink = cleanDoubleUrl(`${currentProtocol}//${currentHost}/live/${streamKey}.m3u8`);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async (targetCam?: Partial<Camera>) => {
    setTestResult({ loading: true });
    try {
      const isTargetRtsp = targetCam ? targetCam.protocol === 'RTSP' : protocol === 'RTSP';
      const payload = {
        protocol: targetCam ? targetCam.protocol : protocol,
        rtspUrl: isTargetRtsp ? (targetCam ? targetCam.rtspUrl : rtspUrl) : '',
        rtmpUrl: targetCam ? (targetCam.rtmpUrl || targetCam.fullRtmpUrl) : fullRtmpUrl,
        streamKey: targetCam ? (targetCam.streamKey || targetCam.id) : streamKey,
      };
      const res = await fetch('/api/cameras/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTestResult({ loading: false, data });
    } catch (e: any) {
      setTestResult({ loading: false, error: e.message || 'Erro ao conectar ao servidor para teste' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser.customPermissions.canManageCameras) {
      alert('Sua conta não possui permissão para gerenciar câmeras.');
      return;
    }

    if (!cameraName.trim()) {
      alert('Por favor, informe o Nome Identificador da Câmera.');
      return;
    }

    if (protocol === 'RTSP' && !rtspUrl.trim()) {
      alert('Por favor, informe a URL RTSP da câmera (ex: rtsp://admin:senha@192.168.1.100:554/live/ch0).');
      return;
    }

    const host = getCurrentHost();
    const key = streamKey || `cam_${Math.random().toString(36).substring(2, 8)}`;
    const cleanKey = key.replace(/^cam-/, '').replace(/^cam_/, '');
    const serverBase = rtmpServer && rtmpServer.trim()
      ? rtmpServer.trim().replace(/\/$/, '')
      : `rtmp://${host}:1935/live`;
    const rtmpStreamSource = `${serverBase}/cam_${cleanKey}`;

    const newCamData: Partial<Camera> = {
      name: cameraName.trim(),
      location: `${selectedCity} - ${selectedUf}`,
      protocol,
      rtspUrl: protocol === 'RTSP' ? rtspUrl : '',
      rtmpUrl: protocol === 'RTMP' ? rtmpStreamSource : '',
      streamKey: `cam_${cleanKey}`,
      rtmpServerUrl: serverBase,
      fullRtmpUrl: protocol === 'RTMP' ? rtmpStreamSource : '',
      stateUf: selectedUf,
      city: selectedCity,
      lat: parseFloat(lat) || -17.0397,
      lng: parseFloat(lng) || -39.5312,
      motionSensitivity,
      aiDetectionEnabled,
      twoWayAudioEnabled,
      isE2EEEncrypted,
      isDemo,
      status: 'ONLINE',
    };

    onAddCamera(newCamData);
    setShowForm(false);

    // Reset form
    setCameraName('');
    handleGenerateStreamKey();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <RadioTower className="w-4 h-4" /> Painel de Transmissão & Câmeras ITL
          </div>
          <h2 className="text-lg font-extrabold text-slate-100">
            Gerenciador de Fontes RTSP / RTMP & Localização no Mapa
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre câmeras com streaming RTMP direto para a câmera física ou conecte links RTSP nativos. Integração IBGE e coordenadas GPS.
          </p>
        </div>

        {activeUser.customPermissions.canManageCameras && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-500/20 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showForm ? 'Fechar Formulário' : '+ Adicionar Câmera ITL'}</span>
          </button>
        )}
      </div>

      {/* Add Camera Form Modal / Box */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Video className="w-4 h-4" />
              Adicionar Nova Câmera no Sistema ITL
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2.5 py-1 rounded-full border border-slate-700">
              Criptografia E2EE AES-256 Ativa
            </span>
          </div>

          {/* Camera Name Identifier */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              Nome Identificador da Câmera: <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Runway VIPW Intelbras P9 ou Câmera Centro 01"
              value={cameraName}
              onChange={(e) => setCameraName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-100 px-4 py-2.5 rounded-xl outline-none text-xs transition"
              required
            />
          </div>

          {/* Protocol Selection Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-2">
              Protocolo de Entrada da Câmera:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProtocol('RTSP')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                  protocol === 'RTSP'
                    ? 'bg-slate-800 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>RTSP (Ativo / Pull)</span>
              </button>

              <button
                type="button"
                onClick={() => setProtocol('RTMP')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                  protocol === 'RTMP'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <RadioTower className="w-4 h-4" />
                <span>RTMP (Empurrado / Push)</span>
              </button>
            </div>
          </div>

          {/* Protocol-Specific Fields */}
          {protocol === 'RTMP' ? (
            <div className="space-y-4 bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Chave de Segurança do Fluxo (Stream Key):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs px-3 py-2 rounded-xl outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGenerateStreamKey}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gerar</span>
                  </button>
                </div>
              </div>

              {/* Parameter Instructions Box */}
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 text-xs space-y-2">
                <p className="text-slate-300 font-semibold text-[11px] text-emerald-400">
                  Configure a transmissão em sua câmera física com os seguintes parâmetros:
                </p>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">SERVIDOR RTMP:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-200">{rtmpServer}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(rtmpServer, 'server')}
                        className="text-emerald-400 hover:text-emerald-300 p-1"
                        title="Copiar Servidor RTMP"
                      >
                        {copiedKey === 'server' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">CHAVE DE FLUXO / STREAM KEY:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-bold">{streamKey}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(streamKey, 'key')}
                        className="text-emerald-400 hover:text-emerald-300 p-1"
                        title="Copiar Stream Key"
                      >
                        {copiedKey === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20 gap-2">
                    <span className="text-slate-300 font-sans font-bold">LINK GERADO PARA CÂMERA:</span>
                    <div className="flex items-center space-x-2 overflow-x-auto">
                      <span className="text-emerald-300 underline font-mono text-[10px] truncate max-w-[280px]">
                        {generatedHttpLink}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedHttpLink, 'generated')}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-1 rounded transition"
                        title="Copiar Link Gerado"
                      >
                        {copiedKey === 'generated' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleTestConnection()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-emerald-500/30 transition"
                >
                  <Activity className="w-4 h-4" />
                  <span>Diagnosticar / Testar Recepção RTMP</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL RTSP Principal da Câmera (Stream H.264 / H.265):
                </label>
                <input
                  type="text"
                  placeholder="rtsp://admin:senha@192.168.1.100:554/live/ch0"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Ex: rtsp://admin:senha@192.168.1.100:554/cam/realmonitor ou DDNS/IP público com porta 554 roteada.
                </p>
              </div>

              {/* RTSP Transcoding Info Box */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                <p className="text-slate-300 font-semibold text-[11px] text-emerald-400">
                  O servidor retransmitirá este RTSP via HLS para navegação web segura:
                </p>
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[11px]">
                  <span className="text-slate-400">LINK GERADO NAVEGADOR:</span>
                  <span className="text-emerald-300 underline">{generatedHttpLink}</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => handleTestConnection()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-emerald-500/30 transition"
                >
                  <Activity className="w-4 h-4" />
                  <span>Diagnosticar & Testar Conexão RTSP (Porta 554)</span>
                </button>
              </div>
            </div>
          )}

          {/* Location & Map Settings (IBGE Integration) */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Localização no Mapa e Dados de Município (API IBGE)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Estado (UF):</label>
                <select
                  value={selectedUf}
                  onChange={(e) => setSelectedUf(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
                >
                  {ufs.map((uf) => (
                    <option key={uf.sigla} value={uf.sigla}>
                      {uf.nome} ({uf.sigla})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Cidade:</label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    if (e.target.value.toLowerCase() === 'itamaraju') {
                      setLat('-17.0397');
                      setLng('-39.5312');
                    } else if (e.target.value.toLowerCase() === 'são paulo' || e.target.value.toLowerCase() === 'sao paulo') {
                      setLat('-23.5615');
                      setLng('-46.6559');
                    } else if (e.target.value.toLowerCase() === 'salvador') {
                      setLat('-12.9777');
                      setLng('-38.5016');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
                  disabled={loadingCities}
                >
                  {loadingCities ? (
                    <option value="">Carregando cidades IBGE...</option>
                  ) : cities.length > 0 ? (
                    cities.map((city) => (
                      <option key={city.id} value={city.nome}>
                        {city.nome}
                      </option>
                    ))
                  ) : (
                    <option value={selectedCity}>{selectedCity}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Latitude (GPS):</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Ex: -17.0397"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 font-mono px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Longitude (GPS):</label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Ex: -39.5312"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 font-mono px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* AI and Security Options */}
          <div className="border-t border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-300">
            <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-amber-500/30 hover:border-amber-500/50 text-amber-300">
              <input
                type="checkbox"
                checked={isDemo}
                onChange={(e) => setIsDemo(e.target.checked)}
                className="rounded accent-amber-400 w-4 h-4"
              />
              <span>★ Câmera de Degustação</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={aiDetectionEnabled}
                onChange={(e) => setAiDetectionEnabled(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>Detecção Movimento IA</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={twoWayAudioEnabled}
                onChange={(e) => setTwoWayAudioEnabled(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>Áudio Bidirecional</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={isE2EEEncrypted}
                onChange={(e) => setIsE2EEEncrypted(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>Criptografia E2EE</span>
            </label>
          </div>

          {/* Form Action Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition"
            >
              Salvar Câmera ITL
            </button>
          </div>
        </form>
      )}

      {/* Camera Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-400" /> Câmeras ITL Cadastradas ({cameras.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Câmeras ativas com transmissão em tempo real e links gerados
            </p>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full w-fit">
            RTSP: Porta 554 | RTMP: Porta 1935
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Câmera / Identificador</th>
                <th className="p-3.5">Localização (IBGE / GPS)</th>
                <th className="p-3.5">Link Gerado RTMP / RTSP</th>
                <th className="p-3.5">Segurança</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {cameras.map((cam) => {
                const isRtsp = cam.protocol === 'RTSP';
                const displayUrl = isRtsp ? (cam.rtspUrl || cam.fullRtmpUrl) : (cam.fullRtmpUrl || cam.rtmpUrl);

                return (
                  <tr key={cam.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{cam.name}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          isRtsp
                            ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                            : 'bg-slate-800 text-emerald-400 border-slate-700'
                        }`}>
                          {isRtsp ? 'RTSP' : 'RTMP'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{cam.location}</div>
                    </td>

                    <td className="p-3.5 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span className="font-medium text-slate-200">
                          {cam.city ? `${cam.city} - ${cam.stateUf}` : cam.location}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Lat: {cam.lat.toFixed(4)} | Lng: {cam.lng.toFixed(4)}
                      </div>
                    </td>

                    <td className="p-3.5 max-w-[240px]">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] text-emerald-400 truncate bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          {displayUrl}
                        </span>
                        <button
                          onClick={() => copyToClipboard(displayUrl, cam.id)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                          title="Copiar Link"
                        >
                          {copiedKey === cam.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="p-3.5">
                      {cam.isE2EEEncrypted ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> E2EE AES-256
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Padrão
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          cam.status === 'ONLINE' || cam.status === 'RECORDING'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'ONLINE' || cam.status === 'RECORDING' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        {cam.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {activeUser.customPermissions.canManageCameras && (
                          <button
                            type="button"
                            onClick={() => onUpdateCamera(cam.id, { isDemo: !cam.isDemo })}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition flex items-center gap-1 ${
                              cam.isDemo
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                            }`}
                            title="Exibir/Ocultar Câmera de Degustação na Página Inicial"
                          >
                            <span>★ {cam.isDemo ? 'Degustação On' : 'Degustação'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTestConnection(cam)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-bold text-[10px] rounded-lg border border-slate-700 hover:border-emerald-500/50 flex items-center gap-1 transition"
                          title="Diagnosticar Conexão"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Testar</span>
                        </button>

                        {activeUser.customPermissions.canManageCameras && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingCamera(cam)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] rounded-lg border border-slate-700 flex items-center gap-1 transition"
                              title="Editar Câmera"
                            >
                              <Pencil className="w-3 h-3 text-emerald-400" />
                              <span>Editar</span>
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Deseja remover a câmera ${cam.name}?`)) {
                                  onDeleteCamera(cam.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Remover Câmera"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnostic Result Modal */}
      {testResult && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative overflow-hidden">
            <button
              onClick={() => setTestResult(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Diagnóstico de Conexão & Teste de Sinal
                </h3>
                <p className="text-[10px] text-slate-400">
                  Relatório de teste em tempo real do fluxo RTSP / RTMP ITL
                </p>
              </div>
            </div>

            {testResult.loading ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-300">
                  Testando porta e pacotes de vídeo da câmera...
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Tentando estabelecer handshake ffprobe / HLS no servidor
                </p>
              </div>
            ) : testResult.error ? (
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Erro de Comunicação com Servidor</span>
                </div>
                <p className="text-slate-300">{testResult.error}</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    testResult.data?.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.data?.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs mb-1">
                      {testResult.data?.success ? 'SINAL CONECTADO COM SUCESSO' : 'SINAL NÃO DETECTADO OU OFF-LINE'}
                    </h4>
                    <p className="text-slate-300 text-[11px]">{testResult.data?.message}</p>
                  </div>
                </div>

                {testResult.data?.details && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-400">
                    <span className="text-slate-200 font-bold block mb-1">Detalhes do Erro:</span>
                    <p className="text-rose-400 text-[10px] break-all">{testResult.data.details}</p>
                  </div>
                )}

                {testResult.data?.logs && testResult.data.logs.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Logs de Execução FFmpeg (Últimas Linhas):</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-slate-400 max-h-36 overflow-y-auto space-y-1">
                      {testResult.data.logs.map((log: string, idx: number) => (
                        <div key={idx} className="truncate">{log}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setTestResult(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
                  >
                    Fechar Diagnóstico
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Edit Modal */}
      {editingCamera && (
        <CameraEditModal
          camera={editingCamera}
          onClose={() => setEditingCamera(null)}
          onSave={(id, updatedData) => {
            onUpdateCamera(id, updatedData);
            setEditingCamera(null);
          }}
        />
      )}
    </div>
  );
};
