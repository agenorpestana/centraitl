import React from 'react';
import {
  Grid,
  Map,
  Film,
  PlusCircle,
  Users,
  FileText,
  Database,
  Smartphone,
  Lock,
  DollarSign,
  Network,
  MapPin,
  Server,
  Code,
} from 'lucide-react';

import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalCameras: number;
  activeUser?: User;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  totalCameras,
  activeUser,
}) => {
  const isAdmin = activeUser
    ? activeUser.role === 'ADMIN' ||
      Boolean(activeUser.customPermissions?.canManageUsers)
    : true;

  const rawNavItems = [
    { id: 'live-grid', label: 'Câmeras ao Vivo', icon: Grid, badge: totalCameras },
    { id: 'event-map', label: 'Mapa de Ocorrências (GIS)', icon: MapPin },
    { id: 'camera-map', label: 'Mapa Vizinhança', icon: Map },
    { id: 'architecture-config', label: 'Arquitetura Fibra & Topology', icon: Network },
    { id: 'cloud-recordings', label: 'Gravações na Nuvem', icon: Film },
    { id: 'camera-admin', label: 'Adicionar / RTSP', icon: PlusCircle },
    { id: 'user-management', label: 'Acesso Multiusuário', icon: Users, adminOnly: true },
    { id: 'api-docs', label: 'Documentação API REST', icon: Code },
    { id: 'financial-management', label: 'Financeiro & Planos', icon: DollarSign },
    { id: 'activity-reports', label: 'Relatórios Diários', icon: FileText },
    { id: 'backup-manager', label: 'Backup Automático', icon: Database },
    { id: 'db-diagnostics', label: 'Teste & Diagnóstico BD', icon: Server },
    { id: 'push-notifications', label: 'Notificações Push', icon: Smartphone },
    { id: 'e2ee-vault', label: 'Criptografia E2EE', icon: Lock },
  ];

  const navItems = rawNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 hidden md:flex min-h-[calc(100vh-65px)] p-3">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">
          Painel de Controle ITL
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/20"
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding Info */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1 text-[11px] text-slate-400">
        <div className="font-bold text-slate-200">Central ITL Fibra</div>
        <div>Segurança & Gravação em Nuvem</div>
      </div>
    </aside>
  );
};
