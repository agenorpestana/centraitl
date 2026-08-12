import React, { useState, useEffect } from 'react';
import {
  X,
  Video,
  Radio,
  RadioTower,
  Save,
  MapPin,
  Lock,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Camera } from '../types';

interface CameraEditModalProps {
  camera: Camera;
  onClose: () => void;
  onSave: (id: string, updatedData: Partial<Camera>) => void;
}

interface IbgeUF {
  sigla: string;
  nome: string;
}

interface IbgeCity {
  id: number;
  nome: string;
}

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
];

export const CameraEditModal: React.FC<CameraEditModalProps> = ({
  camera,
  onClose,
  onSave,
}) => {
  const getCurrentHost = () => {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const h = window.location.hostname;
      if (h && h !== 'localhost' && h !== '127.0.0.1') return h;
    }
    return 'monitoramento.unityautomacoes.com.br';
  };

  const currentHost = getCurrentHost();
  const initialServer = (camera.rtmpServerUrl || `rtmp://${currentHost}:1935/live`).replace(/aerocam\.itlfibra\.com/g, currentHost);
  const rawFull = camera.fullRtmpUrl || camera.rtmpUrl || `${initialServer.replace(/\/$/, '')}/${camera.streamKey || 'cam_01'}`;
  const initialFull = rawFull.replace(/aerocam\.itlfibra\.com/g, currentHost);

  const [name, setName] = useState(camera.name || '');
  const [protocol, setProtocol] = useState<'RTSP' | 'RTMP'>(
    camera.protocol === 'RTMP' ? 'RTMP' : 'RTSP'
  );
  const [rtspUrl, setRtspUrl] = useState(camera.rtspUrl || '');
  const [streamKey, setStreamKey] = useState(
    camera.streamKey || (camera.id ? camera.id.replace(/^cam-/, 'cam_') : 'cam_01')
  );
  const [rtmpServerUrl, setRtmpServerUrl] = useState(initialServer);
  const [fullRtmpUrl, setFullRtmpUrl] = useState(initialFull);
  const [stateUf, setStateUf] = useState(camera.stateUf || 'BA');
  const [city, setCity] = useState(camera.city || 'Itamaraju');
  const [lat, setLat] = useState(camera.lat ? camera.lat.toString() : '-17.0397');
  const [lng, setLng] = useState(camera.lng ? camera.lng.toString() : '-39.5312');
  const [motionSensitivity, setMotionSensitivity] = useState(
    camera.motionSensitivity ?? 8
  );
  const [aiDetectionEnabled, setAiDetectionEnabled] = useState(
    camera.aiDetectionEnabled ?? true
  );
  const [twoWayAudioEnabled, setTwoWayAudioEnabled] = useState(
    camera.twoWayAudioEnabled ?? true
  );
  const [isE2EEEncrypted, setIsE2EEEncrypted] = useState(
    camera.isE2EEEncrypted ?? true
  );
  const [isDemo, setIsDemo] = useState(camera.isDemo ?? false);

  const [ufs, setUfs] = useState<IbgeUF[]>(FALLBACK_UFS);
  const [cities, setCities] = useState<IbgeCity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUfs(data.map((item: any) => ({ sigla: item.sigla, nome: item.nome })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!stateUf) return;
    setLoadingCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUf}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data) => {
        setLoadingCities(false);
        if (Array.isArray(data) && data.length > 0) {
          setCities(data);
        }
      })
      .catch(() => setLoadingCities(false));
  }, [stateUf]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Por favor, informe o Nome da Câmera.');
      return;
    }

    if (protocol === 'RTSP' && !rtspUrl.trim()) {
      alert('Por favor, informe a URL RTSP válida (ex: rtsp://admin:senha@192.168.1.100:554/live/ch0).');
      return;
    }

    const cleanKey = streamKey.trim().replace(/^cam-/, '').replace(/^cam_/, '');
    const validKey = `cam_${cleanKey}`;
    const rtmpStreamSource = fullRtmpUrl.trim().startsWith('rtmp://')
      ? fullRtmpUrl.trim()
      : `${rtmpServerUrl.trim().replace(/\/$/, '')}/${validKey}`;

    const updatedData: Partial<Camera> = {
      name: name.trim(),
      protocol,
      rtspUrl: protocol === 'RTSP' ? rtspUrl.trim() : '',
      streamKey: validKey,
      rtmpServerUrl: rtmpServerUrl.trim(),
      rtmpUrl: protocol === 'RTMP' ? rtmpStreamSource : '',
      fullRtmpUrl: protocol === 'RTMP' ? rtmpStreamSource : '',
      stateUf,
      city,
      location: `${city} - ${stateUf}`,
      lat: parseFloat(lat) || -17.0397,
      lng: parseFloat(lng) || -39.5312,
      motionSensitivity,
      aiDetectionEnabled,
      twoWayAudioEnabled,
      isE2EEEncrypted,
      isDemo,
      status: 'ONLINE',
    };

    onSave(camera.id, updatedData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Editar Câmera: {camera.name}
            </h3>
            <p className="text-xs text-slate-400">
              Altere URLs RTSP/RTMP, protocolo de transmissão, nome e parâmetros de segurança.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Câmera atualizada com sucesso! Reiniciando transcodificador...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome Identificador */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Nome Identificador da Câmera: <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-100 px-3.5 py-2 rounded-xl text-xs outline-none transition"
              required
            />
          </div>

          {/* Protocol Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              Protocolo de Transmissão:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProtocol('RTSP')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                  protocol === 'RTSP'
                    ? 'bg-slate-800 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>RTSP (Conexão Direta / Pull)</span>
              </button>

              <button
                type="button"
                onClick={() => setProtocol('RTMP')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                  protocol === 'RTMP'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <RadioTower className="w-4 h-4" />
                <span>RTMP (Servidor / Push)</span>
              </button>
            </div>
          </div>

          {/* Protocol-Specific Fields */}
          {protocol === 'RTSP' ? (
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-cyan-400">
                URL de Conexão RTSP (DVR / NVR / Câmera IP):
              </label>
              <input
                type="text"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                placeholder="ex: rtsp://admin:senha@10.65.0.1:554/cam/realmonitor"
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 text-cyan-300 font-mono px-3 py-2 rounded-xl text-xs outline-none"
              />
              <p className="text-[10px] text-slate-400">
                O servidor ITL transcodificará este link RTSP para exibição instantânea no navegador.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Servidor RTMP:
                  </label>
                  <input
                    type="text"
                    value={rtmpServerUrl}
                    onChange={(e) => setRtmpServerUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Chave de Transmissão (Stream Key):
                  </label>
                  <input
                    type="text"
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL Completa de Origem RTMP:
                </label>
                <input
                  type="text"
                  value={fullRtmpUrl}
                  onChange={(e) => setFullRtmpUrl(e.target.value)}
                  placeholder={`ex: rtmp://${getCurrentHost()}:1935/live/cam_wpg8tz`}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2 rounded-xl text-xs outline-none"
                />
              </div>
            </div>
          )}

          {/* Localização & Coordenadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Estado (UF):</label>
              <select
                value={stateUf}
                onChange={(e) => setStateUf(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              >
                {ufs.map((uf) => (
                  <option key={uf.sigla} value={uf.sigla}>
                    {uf.nome} ({uf.sigla})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Cidade:</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
                disabled={loadingCities}
              >
                {loadingCities ? (
                  <option value="">Carregando IBGE...</option>
                ) : cities.length > 0 ? (
                  cities.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                    </option>
                  ))
                ) : (
                  <option value={city}>{city}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Latitude GPS:</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Longitude GPS:</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
            <label className="flex items-center space-x-2 cursor-pointer bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 font-bold text-amber-300">
              <input
                type="checkbox"
                checked={isDemo}
                onChange={(e) => setIsDemo(e.target.checked)}
                className="rounded accent-amber-400 w-4 h-4"
              />
              <span>★ Câmera de Degustação (Exibir na Página Inicial)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={aiDetectionEnabled}
                onChange={(e) => setAiDetectionEnabled(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>Detecção Inteligente IA</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={twoWayAudioEnabled}
                onChange={(e) => setTwoWayAudioEnabled(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>Áudio Bidirecional (RTMP)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={isE2EEEncrypted}
                onChange={(e) => setIsE2EEEncrypted(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>Criptografia E2EE (AES-256)</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
