import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Camera as CameraIcon,
  Layers,
  Maximize2,
  Lock,
  Globe
} from 'lucide-react';
import { Camera, User } from '../types';
import { LiveStreamPlayer } from './LiveStreamPlayer';

interface FreeOSMMapProps {
  cameras: Camera[];
  selectedPin: Camera | null;
  onSelectPin: (cam: Camera) => void;
  center: { lat: number; lng: number };
}

const FreeOpenStreetMapComponent: React.FC<FreeOSMMapProps> = ({
  cameras,
  selectedPin,
  onSelectPin,
  center,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Reset container leaflet instance if leftover
    if ((el as any)._leaflet_id) {
      (el as any)._leaflet_id = null;
    }

    let map: L.Map;
    try {
      map = L.map(el, {
        center: [center.lat, center.lng],
        zoom: 9,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: 'abc',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstance.current = map;
    } catch (err) {
      console.warn('Leaflet map init warning:', err);
    }

    return () => {
      if (layerGroupRef.current) {
        try { layerGroupRef.current.clearLayers(); } catch {}
        layerGroupRef.current = null;
      }
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
      }
      if (el && (el as any)._leaflet_id) {
        (el as any)._leaflet_id = null;
      }
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    cameras.forEach((cam) => {
      const lat = Number(cam.lat);
      const lng = Number(cam.lng);
      if (isNaN(lat) || isNaN(lng) || lat === 0) return;

      const isSelected = selectedPin?.id === cam.id;
      const isDemo = Boolean(cam.isDemo || cam.isLiveWebcam);
      const color = isDemo ? '#f59e0b' : cam.status === 'ALERT' ? '#f43f5e' : '#10b981';

      const iconHtml = `
        <div style="
          background-color: ${color};
          width: ${isSelected ? '36px' : '28px'};
          height: ${isSelected ? '36px' : '28px'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: ${isSelected ? '3px solid #ffffff' : '2px solid #020617'};
          box-shadow: 0 0 ${isSelected ? '16px' : '6px'} ${color};
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          <svg width="${isSelected ? '18' : '14'}" height="${isSelected ? '18' : '14'}" viewBox="0 0 24 24" fill="none" stroke="#020617" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'leaflet-custom-marker',
        iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
        iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(layerGroupRef.current!);
      marker.on('click', () => onSelectPin(cam));
    });
  }, [cameras, selectedPin, onSelectPin]);

  return (
    <div className="w-full h-full relative z-0">
      <div ref={containerRef} className="w-full h-full min-h-[550px] rounded-2xl overflow-hidden" />
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/90 text-slate-300 text-[10px] px-2.5 py-1 rounded-xl border border-slate-800 backdrop-blur-md flex items-center space-x-1.5 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-extrabold text-white">Visão Regional (Porto Seguro ↔ Itamaraju ↔ Teixeira de Freitas)</span>
        <span className="text-slate-500">• OpenStreetMap</span>
      </div>
    </div>
  );
};

interface CameraMapProps {
  cameras: Camera[];
  onSelectCamera: (cam: Camera) => void;
  isLoggedIn?: boolean;
  currentUser?: User;
}

export const CameraMap: React.FC<CameraMapProps> = ({
  cameras,
  onSelectCamera,
  isLoggedIn = false,
  currentUser,
}) => {
  const [selectedPin, setSelectedPin] = useState<Camera | null>(cameras[0] || null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const canPlayStream = React.useMemo(() => {
    if (!selectedPin) return false;
    if (selectedPin.isDemo || selectedPin.isLiveWebcam) return true;
    if (isLoggedIn && currentUser) {
      if (currentUser.role === 'ADMIN') return true;
      if (currentUser.customPermissions?.canViewLive) {
        const allowed = currentUser.allowedCameraIds;
        if (!allowed || allowed.includes('ALL') || allowed.includes(selectedPin.id)) {
          return true;
        }
      }
    }
    return false;
  }, [selectedPin, isLoggedIn, currentUser]);

  // Sync selectedPin when cameras prop changes or is filtered
  useEffect(() => {
    if (!selectedPin && cameras.length > 0) {
      const defaultDemo = cameras.find((c) => c.isDemo || c.isLiveWebcam) || cameras[0];
      setSelectedPin(defaultDemo);
    } else if (selectedPin && !cameras.some((c) => c.id === selectedPin.id)) {
      const defaultDemo = cameras.find((c) => c.isDemo || c.isLiveWebcam) || cameras[0] || null;
      setSelectedPin(defaultDemo);
    }
  }, [cameras]);

  const filteredCameras = cameras.filter((c) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'DEMO') return c.isDemo || c.isLiveWebcam;
    return c.status === filterStatus;
  });

  // Calculate map center default based on cameras lat/lng
  const center = React.useMemo(() => {
    if (!cameras.length) return { lat: -17.0397, lng: -39.5312 };
    const validCams = cameras.filter((c) => c.lat && c.lng);
    if (!validCams.length) return { lat: -17.0397, lng: -39.5312 };

    const avgLat = validCams.reduce((acc, c) => acc + Number(c.lat), 0) / validCams.length;
    const avgLng = validCams.reduce((acc, c) => acc + Number(c.lng), 0) / validCams.length;
    return { lat: avgLat, lng: avgLng };
  }, [cameras]);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Mapa Interativo das Câmeras de Vizinhança e Cidade
          </h2>
          <p className="text-xs text-slate-400">
            Geolocalização em tempo real de todas as câmeras de segurança e totens instalados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Map Provider Badge */}
          <div className="px-3 py-1.5 bg-slate-950 text-emerald-400 border border-slate-800 text-xs font-bold rounded-xl flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>OpenStreetMap</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 text-slate-200 border border-slate-700 text-xs px-3 py-1.5 rounded-xl outline-none focus:border-emerald-500"
          >
            <option value="ALL">Todas as Câmeras ({cameras.length})</option>
            <option value="DEMO">⭐ Câmeras de Degustação</option>
            <option value="ONLINE">Online / Ativas</option>
            <option value="RECORDING">Em Gravação Nuvem</option>
            <option value="ALERT">Com Alerta de Movimento</option>
          </select>
        </div>
      </div>

      {/* Main Map + Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View Box */}
        <div className="lg:col-span-2 relative bg-slate-950 border border-slate-800 rounded-2xl min-h-[550px] h-[640px] overflow-hidden shadow-2xl flex flex-col z-0">
          <FreeOpenStreetMapComponent
            cameras={filteredCameras}
            selectedPin={selectedPin}
            onSelectPin={setSelectedPin}
            center={center}
          />
        </div>

        {/* Selected Camera Inspector Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          {selectedPin ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {selectedPin.name}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedPin.location}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    selectedPin.isDemo
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {selectedPin.isDemo ? '★ DEGUSTAÇÃO' : selectedPin.status}
                </span>
              </div>

              {/* Live Player / Video Preview */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video shadow-lg">
                {canPlayStream ? (
                  <LiveStreamPlayer key={selectedPin.id} camera={selectedPin} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-5 text-center space-y-3 bg-slate-950 text-slate-300">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white">Transmissão Restrita a Moradores</h4>
                      <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                        Esta câmera faz parte do circuito fechado de segurança. Apenas câmeras com o selo de <strong className="text-amber-300">Degustação</strong> possuem transmissão aberta ao público.
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectCamera(selectedPin)}
                      className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Acessar Painel para Visualizar</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Details & Specs */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordenadas:</span>
                  <span className="font-mono text-emerald-400">
                    {selectedPin.lat}, {selectedPin.lng}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Protocolo:</span>
                  <span className="font-mono font-bold text-slate-200">{selectedPin.protocol || 'RTMP'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Qualidade:</span>
                  <span className="text-slate-200">{selectedPin.resolution} @ {selectedPin.fps} FPS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Criptografia:</span>
                  <span className="text-emerald-400 font-semibold">AES-256 E2EE Ponta a Ponta</span>
                </div>
              </div>

              <button
                onClick={() => onSelectCamera(selectedPin)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-500/20"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Abrir Câmera em Modo Mosaico</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-2 my-auto">
              <CameraIcon className="w-10 h-10 mx-auto text-slate-700" />
              <p className="text-xs">Selecione uma câmera no mapa para ver a transmissão ao vivo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
