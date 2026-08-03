import React, { useState } from 'react';
import {
  ShieldAlert,
  CreditCard,
  QrCode,
  Copy,
  CheckCircle2,
  PhoneCall,
  Lock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Invoice, User } from '../types';
import { generateMercadoPagoPixPayload } from '../lib/financial';

interface SystemBlockedOverlayProps {
  user: User;
  overdueInvoice?: Invoice;
  onPaymentSuccess: (invoiceId: string) => void;
}

export const SystemBlockedOverlay: React.FC<SystemBlockedOverlayProps> = ({
  user,
  overdueInvoice,
  onPaymentSuccess,
}) => {
  const [copied, setCopied] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Fallback invoice if none supplied directly
  const activeInvoice: Invoice = overdueInvoice || {
    id: `inv-overdue-${user.id}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    planName: user.planName || 'Plano Residencial Essencial',
    amount: user.monthlyFee || 49.90,
    originalAmount: user.monthlyFee || 49.90,
    dueDate: '2026-07-20',
    status: 'OVERDUE',
    isProRata: false,
    createdAt: '2026-07-01',
  };

  const { pixCode, qrCodeUrl } = generateMercadoPagoPixPayload(activeInvoice);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSimulatePayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentDone(true);
      setTimeout(() => {
        onPaymentSuccess(activeInvoice.id);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border-2 border-rose-600/80 rounded-3xl shadow-2xl shadow-rose-950/50 p-6 sm:p-8 space-y-6 my-auto text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/30 ring-8 ring-rose-500/5 animate-pulse">
            <Lock className="w-10 h-10" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-rose-400 bg-rose-950/80 px-3 py-1 rounded-full border border-rose-800">
              Acesso Suspenso - Atraso Superior a 5 Dias
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
              Sistema Bloqueado
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Olá, <strong className="text-white">{user.name}</strong>. O monitoramento das suas câmeras está temporariamente pausado devido a uma pendência financeira em aberto.
            </p>
          </div>
        </div>

        {/* Invoice Summary Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-medium">Plano Contratado:</span>
            <span className="text-white font-bold">{activeInvoice.planName}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-medium">Vencimento Original:</span>
            <span className="text-rose-400 font-mono font-bold">{activeInvoice.dueDate}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Valor para Quitação:</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              R$ {activeInvoice.amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* PIX Payment Section */}
        {paymentDone ? (
          <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-6 text-center space-y-3 animate-in zoom-in-90">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Pagamento Confirmado!</h3>
            <p className="text-xs text-emerald-200">
              Sua fatura foi quitada com sucesso via Mercado Pago. Desbloqueando seu acesso ao sistema...
            </p>
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">
                  Pague com PIX Mercado Pago (Liberação Instantânea 24h)
                </span>
              </div>
              <span className="text-[10px] bg-sky-950 text-sky-400 px-2 py-0.5 rounded font-mono border border-sky-800">
                Mercado Pago
              </span>
            </div>

            {/* QR Code and Code */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="bg-white p-2 rounded-xl shrink-0 shadow-lg">
                <img
                  src={qrCodeUrl}
                  alt="QR Code PIX Mercado Pago"
                  className="w-28 h-28 object-contain"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left w-full overflow-hidden">
                <p className="text-[11px] text-slate-400">
                  Escaneie o QR Code acima pelo app do seu banco ou copie o código 'PIX Copia e Cola':
                </p>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={pixCode}
                    className="w-full bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-300 p-2 pr-10 rounded-lg outline-none truncate"
                  />
                  <button
                    onClick={handleCopyPix}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-md transition"
                    title="Copiar PIX"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {copied && (
                  <p className="text-[10px] text-emerald-400 font-bold animate-pulse">
                    Código PIX copiado com sucesso!
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSimulatePayment}
                disabled={isProcessingPayment}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verificando Pagamento no Mercado Pago...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar / Baixar Pagamento (Mercado Pago API)</span>
                  </>
                )}
              </button>

              <a
                href="https://wa.me/5573999999999?text=Olá,%20preciso%20de%20ajuda%20com%20o%20bloqueio%20do%20meu%20sistema%20ITL"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                <span>Falar com Suporte Financeiro via WhatsApp</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <p className="text-[10px] text-slate-400 text-center">
          Após a confirmação do pagamento, seu sistema será reativado automaticamente em até 2 minutos.
        </p>
      </div>
    </div>
  );
};
