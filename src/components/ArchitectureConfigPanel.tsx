import React, { useState } from 'react';
import {
  Server,
  Network,
  Cpu,
  Layers,
  Database,
  Radio,
  CheckCircle2,
  HardDrive,
  Globe,
  Settings,
  Zap,
  Box,
  Terminal,
  FileCode,
} from 'lucide-react';
import { ArchitectureConfig, StreamInfo } from '../types';

interface ArchitectureConfigPanelProps {
  config: ArchitectureConfig;
  streams: StreamInfo[];
  onUpdateConfig: (newCfg: ArchitectureConfig) => Promise<void>;
}

export const ArchitectureConfigPanel: React.FC<ArchitectureConfigPanelProps> = ({
  config,
  streams,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'topology' | 'gateways' | 'docs'>('topology');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Network className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-black text-white tracking-tight">Arquitetura de Rede Fibra & Ingestão Video</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              MEDIAMTX + FFMPEG + ONVIF
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Conexão direta por Fibra Óptica, ingestão MediaMTX centralizada com GPU e redundância Edge em Jetson Orin.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('topology')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'topology'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Topologia & Datacenter</span>
        </button>

        <button
          onClick={() => setActiveTab('gateways')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'gateways'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Streams MediaMTX & ONVIF ({streams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'docs'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Guia de Instalação & Pipelines</span>
        </button>
      </div>

      {/* TAB 1: Topology Selection */}
      {activeTab === 'topology' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => onUpdateConfig({ ...config, primaryTopology: 'CENTRAL_GPU' })}
              className={`p-5 rounded-2xl border cursor-pointer transition space-y-3 ${
                config.primaryTopology === 'CENTRAL_GPU'
                  ? 'bg-cyan-950/30 border-cyan-500 shadow-xl ring-2 ring-cyan-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <Server className="w-6 h-6 text-cyan-400" />
                {config.primaryTopology === 'CENTRAL_GPU' && (
                  <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <h3 className="font-bold text-sm text-white">Opção B — Servidor Central GPU (Recomendado)</h3>
              <p className="text-xs text-slate-400">
                Inspecção de vídeos transmitidos diretamente via rede de Fibra do Provedor para o Datacenter Central com cluster NVIDIA.
              </p>
            </div>

            <div
              onClick={() => onUpdateConfig({ ...config, primaryTopology: 'HYBRID_RESILIENT' })}
              className={`p-5 rounded-2xl border cursor-pointer transition space-y-3 ${
                config.primaryTopology === 'HYBRID_RESILIENT'
                  ? 'bg-indigo-950/30 border-indigo-500 shadow-xl ring-2 ring-indigo-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <Box className="w-6 h-6 text-indigo-400" />
                {config.primaryTopology === 'HYBRID_RESILIENT' && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                )}
              </div>
              <h3 className="font-bold text-sm text-white">Opção C — Híbrida Resiliente (Edge + Datacenter)</h3>
              <p className="text-xs text-slate-400">
                Processamento primário no Datacenter com cache local e placas Jetson Orin para pontos críticos sem tolerância a falhas.
              </p>
            </div>

            <div
              onClick={() => onUpdateConfig({ ...config, primaryTopology: 'DISTRIBUTED_EDGE' })}
              className={`p-5 rounded-2xl border cursor-pointer transition space-y-3 ${
                config.primaryTopology === 'DISTRIBUTED_EDGE'
                  ? 'bg-emerald-950/30 border-emerald-500 shadow-xl ring-2 ring-emerald-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <Cpu className="w-6 h-6 text-emerald-400" />
                {config.primaryTopology === 'DISTRIBUTED_EDGE' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <h3 className="font-bold text-sm text-white">Opção A — Totalmente Distribuído (Edge Local)</h3>
              <p className="text-xs text-slate-400">
                Toda a inferência é feita localmente nas câmeras ou micro-servidores de borda, enviando apenas metadados leves ao central.
              </p>
            </div>
          </div>

          {/* Service Endpoints Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Serviços de Infraestrutura Conectados</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Gateway RTSP MediaMTX</span>
                <input
                  type="text"
                  value={config.centralMediaMtxUrl}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, centralMediaMtxUrl: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Barramento Redis / BullMQ</span>
                <input
                  type="text"
                  value={config.redisQueueUrl}
                  onChange={(e) => onUpdateConfig({ ...config, redisQueueUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">PostgreSQL + pgvector</span>
                <input
                  type="text"
                  value={config.postgresVectorUrl}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, postgresVectorUrl: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">S3 / MinIO Storage de Evidências</span>
                <input
                  type="text"
                  value={config.minioStorageUrl}
                  onChange={(e) => onUpdateConfig({ ...config, minioStorageUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Streams Overview */}
      {activeTab === 'gateways' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {streams.map((s) => (
              <div
                key={s.cameraId}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">{s.cameraName}</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {s.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <p>RTSP: <span className="text-cyan-400">{s.rtspUrl}</span></p>
                  <p>HLS: <span className="text-slate-400">{s.hlsUrl}</span></p>
                  <p>Bitrate: <span className="text-emerald-400">{s.bitrateKbps} Kbps</span> | Codec: {s.codecs}</p>
                  <p>Gateway Ingestão: <span className="text-indigo-400">{s.ingestGateway}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Documentation */}
      {activeTab === 'docs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs text-slate-300">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Guia Técnico de Ingestão & Pipeline de Inferencia</span>
          </h3>

          <div className="space-y-3 font-mono bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-300">
            <p className="text-cyan-400 font-bold"># 1. Configurar Gateway MediaMTX em Docker no Datacenter Fibra:</p>
            <p className="text-slate-400">docker run --rm -d --network=host bluenviron/mediamtx:latest</p>

            <p className="text-cyan-400 font-bold pt-2"># 2. Pipeline GStreamer com DeepStream GPU para LPR + Facial:</p>
            <p className="text-slate-400">
              gst-launch-1.0 rtspsrc location=rtsp://cam01_main ! rtph264depay ! h264parse ! nvv4l2decoder ! nvstreammux ! nvinfer config-file-path=yolov11_lpr.txt ! nvtracker ! nvinfer config-file-path=arcface_512d.txt ! fakesink
            </p>

            <p className="text-cyan-400 font-bold pt-2"># 3. Iniciar Worker BullMQ / Express Ingestion Cluster:</p>
            <p className="text-slate-400">npm run start:workers</p>
          </div>
        </div>
      )}
    </div>
  );
};
