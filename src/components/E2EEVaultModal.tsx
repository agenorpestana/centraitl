import React, { useState } from 'react';
import { Lock, Unlock, Key, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { E2EESettings } from '../types';

interface E2EEVaultModalProps {
  settings: E2EESettings;
  isOpen: boolean;
  onClose: () => void;
  onToggleVault: (unlocked: boolean) => void;
}

export const E2EEVaultModal: React.FC<E2EEVaultModalProps> = ({
  settings,
  isOpen,
  onClose,
  onToggleVault,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.length < 4) {
      setErrorMsg('Forneça a frase secreta de pelo menos 4 caracteres.');
      return;
    }
    onToggleVault(true);
    setErrorMsg('');
    onClose();
  };

  const handleLock = () => {
    onToggleVault(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Criptografia Ponta a Ponta (E2EE)</h3>
              <p className="text-[11px] text-slate-400">Padrão AES-256-GCM Zero-Knowledge</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {settings.isVaultUnlocked ? (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Cofre E2EE Ativo e Desbloqueado
              </p>
              <p className="text-[11px]">
                Todas as 5 transmissões ao vivo RTSP/RTMP e gravações em nuvem estão sendo decodificadas localmente no navegador.
              </p>
            </div>

            <div className="space-y-1 font-mono text-[11px] bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Algoritmo:</span>
                <span className="text-emerald-400 font-bold">{settings.algorithm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Streams Protegidas:</span>
                <span className="text-white">{settings.totalEncryptedStreams} câmeras</span>
              </div>
            </div>

            <button
              onClick={handleLock}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow"
            >
              Bloquear Cofre de Segurança Agora
            </button>
          </div>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-4 text-xs">
            <p className="text-slate-300">
              Digite a frase Mestra E2EE para descriptografar os vídeos e arquivos de áudio ao vivo:
            </p>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Frase Mestra / Passkey:</label>
              <input
                type="password"
                placeholder="Insira sua frase secreta..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              />
              {errorMsg && <p className="text-rose-400 text-[10px] mt-1">{errorMsg}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
            >
              Desbloquear Cofre E2EE
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
