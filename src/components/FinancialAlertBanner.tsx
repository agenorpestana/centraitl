import React from 'react';
import { AlertTriangle, CreditCard, ArrowRight, ShieldAlert } from 'lucide-react';
import { Invoice } from '../types';

interface FinancialAlertBannerProps {
  invoice: Invoice;
  daysUntilDue: number;
  daysOverdue: number;
  onOpenPaymentModal: (invoice: Invoice) => void;
}

export const FinancialAlertBanner: React.FC<FinancialAlertBannerProps> = ({
  invoice,
  daysUntilDue,
  daysOverdue,
  onOpenPaymentModal,
}) => {
  const isOverdue = daysOverdue > 0;

  return (
    <div
      className={`w-full py-2.5 px-4 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg transition animate-in slide-in-from-top duration-300 ${
        isOverdue
          ? 'bg-rose-950/90 text-rose-200 border-b border-rose-500/40'
          : 'bg-amber-950/90 text-amber-200 border-b border-amber-500/40'
      }`}
    >
      <div className="flex items-center space-x-2.5 truncate">
        {isOverdue ? (
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        )}

        <span className="truncate">
          {isOverdue ? (
            <span>
              <strong>ALERTA FINANCEIRO:</strong> Sua fatura no valor de{' '}
              <strong className="text-white">R$ {invoice.amount.toFixed(2)}</strong> está em atraso há{' '}
              <strong className="text-rose-400 underline">{daysOverdue} dia(s)</strong> (venceu dia {invoice.dueDate}). O sistema será bloqueado se atingir 5 dias de atraso.
            </span>
          ) : (
            <span>
              <strong>AVISO DE VENCIMENTO:</strong> Sua fatura no valor de{' '}
              <strong className="text-white">R$ {invoice.amount.toFixed(2)}</strong> vence em{' '}
              <strong className="text-amber-300">
                {daysUntilDue === 0 ? 'HOJE' : `${daysUntilDue} dia(s)`}
              </strong>{' '}
              (vencimento dia {invoice.dueDate}). Evite interrupções no serviço.
            </span>
          )}
        </span>
      </div>

      <button
        onClick={() => onOpenPaymentModal(invoice)}
        className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 shadow-md ${
          isOverdue
            ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/20'
            : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
        }`}
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>Pagar Fatura via Mercado Pago</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
