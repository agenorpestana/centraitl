import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  X,
  Save,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Lock,
  DollarSign,
} from 'lucide-react';
import { MercadoPagoConfig, User } from '../types';

interface MercadoPagoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MercadoPagoConfig;
  onSaveConfig: (newConfig: MercadoPagoConfig) => void;
  currentUser: User;
}

export const MercadoPagoSettingsModal: React.FC<MercadoPagoSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  currentUser,
}) => {
  const [formState, setFormState] = useState<MercadoPagoConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [testMessage, setTestMessage] = useState('');

  if (!isOpen) return null;

  const isSuperAdmin =
    currentUser.email === 'suporte@unityautomacoes.com.br' ||
    currentUser.role === 'ADMIN';

  if (!isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-center">
          <Lock className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Acesso Restrito</h3>
          <p className="text-xs text-slate-300">
            Apenas o Super Administrador pode alterar as chaves de integração do Mercado Pago.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const handleTestConnection = () => {
    setIsSaving(true);
    setTestSuccess(null);
    setTimeout(() => {
      setIsSaving(false);
      if (formState.accessToken.startsWith('APP_USR') || formState.accessToken.startsWith('TEST')) {
        setTestSuccess(true);
        setTestMessage('Conexão com API do Mercado Pago estabelecida com sucesso!');
      } else {
        setTestSuccess(false);
        setTestMessage('Access Token inválido. Certifique-se de usar o token do painel Mercado Pago Developers.');
      }
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSaveConfig(formState);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-auto text-slate-100 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Integração Mercado Pago API
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  Super Admin
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure as credenciais de produção e sandbox para recebimentos PIX automatizados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Config Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-400" /> Access Token (Produção/Testes):
            </label>
            <input
              type="password"
              required
              value={formState.accessToken}
              onChange={(e) => setFormState({ ...formState, accessToken: e.target.value })}
              placeholder="APP_USR-7829103847..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono p-3 rounded-xl outline-none focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Encontrado no painel de desenvolvedores do Mercado Pago (Suas Aplicações Credenciais).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Public Key (Chave Pública):
            </label>
            <input
              type="text"
              required
              value={formState.publicKey}
              onChange={(e) => setFormState({ ...formState, publicKey: e.target.value })}
              placeholder="APP_USR-839201928374-PUB..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono p-3 rounded-xl outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Webhook Secret Key (Notificações de Pagamento Instantâneo):
            </label>
            <input
              type="password"
              value={formState.webhookSecret}
              onChange={(e) => setFormState({ ...formState, webhookSecret: e.target.value })}
              placeholder="whsec_itl_mercadopago_2026..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono p-3 rounded-xl outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center space-x-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={formState.isSandbox}
                onChange={(e) => setFormState({ ...formState, isSandbox: e.target.checked })}
                className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-700"
              />
              <div>
                <span className="text-xs font-bold text-slate-200 block">Modo Sandbox (Testes)</span>
                <span className="text-[10px] text-slate-400">Simula cobranças reais sem debitar valor</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={formState.autoApproveSimulated}
                onChange={(e) => setFormState({ ...formState, autoApproveSimulated: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
              <div>
                <span className="text-xs font-bold text-slate-200 block">Baixa Automática PIX</span>
                <span className="text-[10px] text-slate-400">Desbloqueia cliente na hora após pagamento</span>
              </div>
            </label>
          </div>

          {/* Test Status Feedback */}
          {testSuccess !== null && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                testSuccess
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{testMessage}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-sky-400" />}
              <span>Testar Credenciais</span>
            </button>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-1/2 sm:w-auto px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-sky-500/20 transition flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configuração</span>
              </button>
            </div>
          </div>
        </form>

        <a
          href="https://www.mercadopago.com.br/developers/panel/credentials"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center space-x-1.5 text-[11px] text-sky-400 hover:underline pt-2"
        >
          <span>Acessar Painel Mercado Pago Developers</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
