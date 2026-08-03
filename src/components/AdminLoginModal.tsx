import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Key, CheckCircle, AlertCircle, X, UserCheck } from 'lucide-react';
import { User } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  activeUser: User;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  activeUser,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (loginEmail === 'suporte@unityautomacoes.com.br' && loginPass === '200616') {
      const superUser: User = {
        id: 'user-superadmin-01',
        name: 'Super Admin Unity (ITL)',
        email: 'suporte@unityautomacoes.com.br',
        role: 'ADMIN',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: '+55 11 98765-4321',
        status: 'ACTIVE',
        customPermissions: {
          canViewLive: true,
          canViewRecordings: true,
          canControlPTZ: true,
          canUseTwoWayAudio: true,
          canManageCameras: true,
          canDeleteRecordings: true,
          canAccessAuditLogs: true,
          canManageUsers: true,
          canExportReports: true,
        },
        lastActive: 'Agora mesmo',
        createdAt: '2026-01-01',
      };

      setSuccessMsg('Autenticado com sucesso como Super Admin!');
      setTimeout(() => {
        onLoginSuccess(superUser);
        onClose();
      }, 700);
      return;
    }

    // Try backend API login
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setSuccessMsg(`Bem-vindo, ${data.user.name}!`);
        setTimeout(() => {
          onLoginSuccess(data.user);
          onClose();
        }, 700);
      } else {
        setErrorMsg(data.error || 'Credenciais inválidas. Verifique o email e a senha.');
      }
    } catch {
      setErrorMsg('Erro de conexão. Verifique se o servidor backend está online.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Autenticação do Painel Administrativo ITL</h3>
          <p className="text-xs text-slate-400">
            Informe seu e-mail e senha para acessar as câmeras autorizadas, mapa e configurações.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Email do Administrador:</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="suporte@unityautomacoes.com.br"
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-9 pr-3 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Senha de Acesso:</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-9 pr-3 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-xs"
                required
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              Autenticar e Acessar Painel
            </button>
          </div>
        </form>

        <div className="text-center text-[11px] text-slate-500">
          Atualmente conectado como: <span className="text-slate-300 font-bold">{activeUser.name}</span> ({activeUser.role})
        </div>
      </div>
    </div>
  );
};
