import React from 'react';
import { Camera, Lock, LogOut } from 'lucide-react';
import { User, WhiteLabelConfig } from '../types';

interface NavbarProps {
  activeUser: User;
  onSelectUser: (user: User) => void;
  allUsers: User[];
  onOpenE2EEModal: () => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  isVaultUnlocked: boolean;
  whitelabelConfig?: WhiteLabelConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  onSelectUser,
  allUsers,
  onOpenE2EEModal,
  onOpenLoginModal,
  onLogout,
  isVaultUnlocked,
  whitelabelConfig,
}) => {
  const isSuperAdmin = activeUser.role === 'ADMIN' && !activeUser.companyId;
  const isCompanyAdmin = activeUser.role === 'COMPANY_ADMIN' || Boolean(activeUser.isCompanyAdmin);
  const brandName = activeUser.companyName || whitelabelConfig?.name || 'CENTRAL ITL';
  const logoUrl = whitelabelConfig?.logoUrl;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-3 sm:px-4 py-2 sm:py-3 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & System Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {logoUrl && !logoUrl.includes('via.placeholder') ? (
            <img
              src={logoUrl}
              alt={brandName}
              className="h-8 sm:h-9 max-w-[140px] object-contain rounded-lg"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
              <Camera className="w-4 h-4 sm:w-6 sm:h-6 text-slate-950 font-bold" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1 sm:gap-2">
              <h1 className="font-bold text-sm sm:text-lg text-slate-100 tracking-tight whitespace-nowrap">{brandName}</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="hidden xs:inline">ONLINE 24H</span>
                <span className="xs:hidden">24H</span>
              </span>
              {isSuperAdmin && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                  <span className="hidden sm:inline">SUPER ADMIN</span>
                  <span className="sm:hidden">ADMIN</span>
                </span>
              )}
              {isCompanyAdmin && (
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                  ADMIN EMPRESA
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden sm:block">
              {activeUser.companyName ? `Unidade ${activeUser.companyName}` : 'Segurança ITL Fibra & Câmeras em Nuvem'}
            </p>
          </div>
        </div>

        {/* Quick Actions & Status Badges */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* E2EE Lock Status */}
          <button
            onClick={onOpenE2EEModal}
            className={`hidden md:flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              isVaultUnlocked
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/50'
            }`}
            title="Criptografia Ponta a Ponta (E2EE) ativada"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="font-medium">{isVaultUnlocked ? 'E2EE Ativo' : 'E2EE Bloqueado'}</span>
          </button>

          {/* User Profile Info */}
          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 sm:px-2.5 sm:py-1">
            <img
              src={activeUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={activeUser.name}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-1 ring-emerald-500/40"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{activeUser.name}</p>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{activeUser.role}</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 p-1.5 sm:px-3 sm:py-1.5 rounded-lg transition shrink-0"
            title="Sair do sistema"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};
