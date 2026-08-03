import React, { useState } from 'react';
import {
  Smartphone,
  Send,
  Bell,
  CheckCircle2,
  Key,
  MessageSquare,
  Volume2,
  Moon,
  Zap,
} from 'lucide-react';
import { NotificationConfig, User } from '../types';

interface PushNotificationSettingsProps {
  config: NotificationConfig;
  activeUser: User;
  onUpdateConfig: (newConfig: Partial<NotificationConfig>) => void;
  onTestPush: () => void;
}

export const PushNotificationSettings: React.FC<PushNotificationSettingsProps> = ({
  config,
  activeUser,
  onUpdateConfig,
  onTestPush,
}) => {
  const [testSent, setTestSent] = useState(false);

  const handleTest = () => {
    onTestPush();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            Integração com Dispositivos Inteligentes & Notificação Push no Celular
          </h2>
          <p className="text-xs text-slate-400">
            Receba alertas de movimento instantâneos no seu aplicativo Android/iOS, Telegram ou WhatsApp
          </p>
        </div>

        <button
          onClick={handleTest}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-lg shadow-emerald-500/20"
        >
          <Send className="w-4 h-4" />
          <span>Enviar Teste de Push Agora</span>
        </button>
      </div>

      {testSent && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 p-4 rounded-2xl flex items-center space-x-3 shadow-xl animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Notificação Push enviada com sucesso!</p>
            <p className="text-[11px] text-emerald-300">
              Disparada via Firebase Cloud Messaging (FCM) para os dispositivos móveis pareados da Central Gabriel.
            </p>
          </div>
        </div>
      )}

      {/* Main Settings Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mobile Push & FCM Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Configurações de Push App Celular (FCM)
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={config.pushEnabled}
                onChange={(e) => onUpdateConfig({ pushEnabled: e.target.checked })}
                className="accent-emerald-500 rounded w-4 h-4"
              />
              <span className="font-bold">Ativar Notificações Push Globais no Celular</span>
            </label>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Chave do Servidor FCM (Firebase Cloud Messaging):</label>
              <input
                type="text"
                value={config.fcmServerKey}
                onChange={(e) => onUpdateConfig({ fcmServerKey: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl font-mono text-xs outline-none focus:border-emerald-500"
                placeholder="Chave FCM..."
              />
            </div>

            <label className="flex items-center space-x-2 cursor-pointer text-slate-300 pt-1">
              <input
                type="checkbox"
                checked={config.soundAlerts}
                onChange={(e) => onUpdateConfig({ soundAlerts: e.target.checked })}
                className="accent-emerald-500 rounded w-4 h-4"
              />
              <span>Tocar som de sirene para alertas críticos no celular</span>
            </label>
          </div>
        </div>

        {/* Telegram & WhatsApp Integrations */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Integração Telegram & Webhooks
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Token do Bot no Telegram:</label>
              <input
                type="text"
                value={config.telegramBotToken}
                onChange={(e) => onUpdateConfig({ telegramBotToken: e.target.value })}
                placeholder="Ex: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl font-mono text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">ID do Chat / Grupo Telegram:</label>
              <input
                type="text"
                value={config.telegramChatId}
                onChange={(e) => onUpdateConfig({ telegramChatId: e.target.value })}
                placeholder="Ex: -100123456789"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl font-mono text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">URL Webhook do WhatsApp Business / Z-API:</label>
              <input
                type="text"
                value={config.whatsappWebhookUrl}
                onChange={(e) => onUpdateConfig({ whatsappWebhookUrl: e.target.value })}
                placeholder="https://api.z-api.io/instances/..."
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl font-mono text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
