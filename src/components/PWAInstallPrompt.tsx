import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Check, Shield, Share } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    if (iosDevice) {
      // Show iOS prompt if not dismissed in this session
      const iosDismissed = sessionStorage.getItem('pwa_ios_dismissed');
      if (!iosDismissed) {
        setShowPrompt(true);
      }
    }

    // Listen for beforeinstallprompt event (Android / Chrome / Desktop Edge/Brave)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      alert('Para instalar o app Central ITL, abra o menu do seu navegador e selecione "Adicionar à Tela Inicial" ou "Instalar Aplicativo".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    if (isIOS) {
      sessionStorage.setItem('pwa_ios_dismissed', 'true');
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Floating Bottom PWA Banner */}
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-bounce-short">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl relative flex items-center space-x-3 text-slate-100">
            <button
              onClick={dismissPrompt}
              className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full border border-slate-700 flex items-center justify-center transition shadow-md"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-lg shadow-emerald-500/20">
              <Shield className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <h4 className="font-extrabold text-xs text-white truncate flex items-center gap-1">
                <span>App Central ITL</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-mono">PWA</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">
                Instale para acesso rápido 24h com visualização em tela cheia e baixo consumo de dados.
              </p>
            </div>

            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-1 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
          </div>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Instalar no iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Adicione à Tela de Início via Safari</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
                <p>Toque no botão <strong className="text-white flex items-center gap-1 inline-flex"><Share className="w-3.5 h-3.5 text-blue-400" /> Compartilhar</strong> na barra inferior do Safari.</p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
                <p>Role a lista de opções e selecione <strong className="text-white">"Adicionar à Tela de Início"</strong>.</p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
                <p>Confirme clicando em <strong className="text-emerald-400">Adicionar</strong> no canto superior direito.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
