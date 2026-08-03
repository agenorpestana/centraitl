import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Camera as CameraIcon } from 'lucide-react';
import { Camera } from '../types';

interface EventMapPanelProps {
  cameras: Camera[];
}

export const EventMapPanel: React.FC<EventMapPanelProps> = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const defaultCenter = cameras.length > 0 && cameras[0].lat && cameras[0].lng
    ? { lat: cameras[0].lat, lng: cameras[0].lng }
    : { lat: -17.0397, lng: -39.5312 };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if ((el as any)._leaflet_id) {
      (el as any)._leaflet_id = null;
    }

    let map: L.Map;
    try {
      map = L.map(el, {
        center: [defaultCenter.lat, defaultCenter.lng],
        zoom: 12,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstance.current = map;
    } catch (err) {
      console.warn('EventMapPanel Leaflet init warning:', err);
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
  }, []);

  useEffect(() => {
    const layerGroup = layerGroupRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    cameras.forEach((cam) => {
      if (!cam.lat || !cam.lng) return;

      const iconHtml = `<div class="w-8 h-8 rounded-full ${
        cam.status === 'ONLINE' ? 'bg-emerald-600' : 'bg-slate-600'
      } border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg">🎥</div>`;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([cam.lat, cam.lng], { icon: customIcon });
      marker.on('click', () => setSelectedCamera(cam));
      marker.addTo(layerGroup);
    });
  }, [cameras]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-black text-white tracking-tight">Mapa Georreferenciado de Câmeras</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              GIS AO VIVO
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Mapeamento espacial da rede de câmeras e transmissões em tempo real.
          </p>
        </div>
      </div>

      {/* Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 h-[550px] relative overflow-hidden shadow-2xl">
          <div ref={containerRef} className="w-full h-full rounded-xl z-10" />
        </div>

        {/* Selected Camera Details Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Detalhes da Câmera Selecionada</h3>

          {selectedCamera ? (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    {selectedCamera.status}
                  </span>
                  <span className="text-[10px] text-slate-400">{selectedCamera.resolution}</span>
                </div>

                <p className="text-base font-bold text-white pt-1">{selectedCamera.name}</p>
                <p className="text-slate-400">{selectedCamera.location}</p>
                <p className="text-[10px] text-mono text-cyan-400">
                  Lat: {selectedCamera.lat} | Lng: {selectedCamera.lng}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 italic">
              Clique em um marcador no mapa para inspecionar as informações da câmera.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
