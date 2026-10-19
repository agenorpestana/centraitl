import { FinancialPlan, Invoice, InvoiceStatus, MercadoPagoConfig } from '../types';

export const INITIAL_PLANS: FinancialPlan[] = [
  {
    id: 'plan-basic-49',
    name: 'Plano Residencial Essencial',
    monthlyPrice: 49.90,
    camerasIncluded: 2,
    cloudRetentionDays: 7,
    description: 'Acesso ao vivo e gravação em nuvem por 7 dias para até 2 câmeras.',
    popular: true,
  },
  {
    id: 'plan-pro-89',
    name: 'Plano Comercial Pro',
    monthlyPrice: 89.90,
    camerasIncluded: 5,
    cloudRetentionDays: 15,
    description: 'Monitoramento 24h, alerta inteligente de IA e gravação de 15 dias.',
  },
  {
    id: 'plan-vizinhanca-149',
    name: 'Plano Vizinhança Protegida ITL',
    monthlyPrice: 149.90,
    camerasIncluded: 10,
    cloudRetentionDays: 30,
    description: 'Ideal para condomínios e bairros com gravação HD de 30 dias na nuvem.',
  },
];

export const INITIAL_MP_CONFIG: MercadoPagoConfig = {
  accessToken: 'APP_USR-7829103847192837-072716-a1b2c3d4e5f6g7h8i9j0-123456789',
  publicKey: 'APP_USR-839201928374-PUB-2026',
  webhookSecret: 'whsec_itl_mercadopago_2026_key',
  isSandbox: true,
  autoApproveSimulated: true,
};

/**
 * Calculates initial or recurring invoice with ITL business rules:
 * - Fixed due days allowed: 5, 10, 15, or 20
 * - If contract date to upcoming due day is 5 days or less:
 *   Charge full normal monthly fee (e.g. R$ 49.90) and set first due date to next month's due day!
 * - If difference > 5 days:
 *   Charge pro-rata (proportional days) up to the next due day in the current/next month.
 */
export function calculateSubscriptionBilling(
  planPrice: number,
  chosenDueDay: 5 | 10 | 15 | 20,
  contractDateStr?: string
): {
  amount: number;
  originalAmount: number;
  dueDate: string; // YYYY-MM-DD
  isProRata: boolean;
  proRataDays: number;
  explanation: string;
} {
  const contractDate = contractDateStr ? new Date(contractDateStr) : new Date();
  
  // Normalize time to midnight for accurate day diff
  const todayMidnight = new Date(contractDate.getFullYear(), contractDate.getMonth(), contractDate.getDate());
  
  // Target due date in current month
  let targetYear = todayMidnight.getFullYear();
  let targetMonth = todayMidnight.getMonth(); // 0-indexed
  
  let targetDueDate = new Date(targetYear, targetMonth, chosenDueDay);

  // If today is on or past the chosen due day in current month, target due date moves to next month
  if (todayMidnight.getDate() >= chosenDueDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    targetDueDate = new Date(targetYear, targetMonth, chosenDueDay);
  }

  // Calculate difference in calendar days
  const diffTime = targetDueDate.getTime() - todayMidnight.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let finalDueDate = targetDueDate;
  let amount = planPrice;
  let isProRata = false;
  let proRataDays = diffDays;
  let explanation = '';

  // RULE: If difference is 5 days or less, charge full normal monthly fee and extend due date to next month
  if (diffDays <= 5) {
    // Extend due date to the following month
    let nextMonth = targetDueDate.getMonth() + 1;
    let nextYear = targetDueDate.getFullYear();
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    finalDueDate = new Date(nextYear, nextMonth, chosenDueDay);
    
    amount = planPrice;
    isProRata = false;
    explanation = `Intervalo curto de ${diffDays} dia(s) até dia ${chosenDueDay}: Cobrança mensal normal de R$ ${planPrice.toFixed(2)} com próximo vencimento em ${finalDueDate.toLocaleDateString('pt-BR')}.`;
  } else {
    // Charge pro-rata
    const dailyRate = planPrice / 30;
    amount = Math.round((dailyRate * diffDays) * 100) / 100;
    isProRata = true;
    explanation = `Cobrança proporcional de ${diffDays} dia(s) (R$ ${(planPrice/30).toFixed(2)}/dia) até o vencimento do dia ${chosenDueDay} (${finalDueDate.toLocaleDateString('pt-BR')}).`;
  }

  const dueDateFormatted = finalDueDate.toISOString().split('T')[0];

  return {
    amount,
    originalAmount: planPrice,
    dueDate: dueDateFormatted,
    isProRata,
    proRataDays,
    explanation,
  };
}

/**
 * Checks an invoice's due status against current date
 * Rules:
 * - Warning alert: when 5 days or less remain before due date
 * - System Block: when invoice is overdue by MORE than 5 days
 */
export function checkInvoiceFinancialStatus(
  dueDateStr: string,
  invoiceStatus: InvoiceStatus
): {
  financialStatus: 'OK' | 'WARNING' | 'BLOCKED';
  daysUntilDue: number; // Positive if future, negative if past
  daysOverdue: number;
  shouldAlert: boolean;
  shouldBlock: boolean;
  message: string;
} {
  if (invoiceStatus === 'PAID' || invoiceStatus === 'CANCELLED') {
    return {
      financialStatus: 'OK',
      daysUntilDue: 999,
      daysOverdue: 0,
      shouldAlert: false,
      shouldBlock: false,
      message: 'Fatura quitada.',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dueDateStr.split('-').map(Number);
  const dueDate = new Date(year, month - 1, day);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) {
    // Overdue
    const daysOverdue = Math.abs(daysUntilDue);
    if (daysOverdue > 5) {
      return {
        financialStatus: 'BLOCKED',
        daysUntilDue,
        daysOverdue,
        shouldAlert: true,
        shouldBlock: true,
        message: `SISTEMA BLOQUEADO: Fatura atrasada há ${daysOverdue} dias (venceu em ${dueDate.toLocaleDateString('pt-BR')}). Regularize via Mercado Pago / PIX.`,
      };
    } else {
      return {
        financialStatus: 'WARNING',
        daysUntilDue,
        daysOverdue,
        shouldAlert: true,
        shouldBlock: false,
        message: `ATENÇÃO: Fatura em atraso há ${daysOverdue} dia(s). Evite o bloqueio do sistema efetuando o pagamento.`,
      };
    }
  } else {
    // Future due date
    if (daysUntilDue <= 5) {
      return {
        financialStatus: 'WARNING',
        daysUntilDue,
        daysOverdue: 0,
        shouldAlert: true,
        shouldBlock: false,
        message: `ALERTA FINANCEIRO: Sua fatura de mensalidade vence em ${daysUntilDue === 0 ? 'HOJE' : `${daysUntilDue} dia(s)`} (${dueDate.toLocaleDateString('pt-BR')}).`,
      };
    } else {
      return {
        financialStatus: 'OK',
        daysUntilDue,
        daysOverdue: 0,
        shouldAlert: false,
        shouldBlock: false,
        message: `Fatura em dia. Vencimento em ${daysUntilDue} dias.`,
      };
    }
  }
}

/**
 * Generates a realistic Mercado Pago PIX Copy-and-Paste Payload
 */
export function generateMercadoPagoPixPayload(invoice: Invoice): {
  pixCode: string;
  qrCodeUrl: string;
} {
  const amountFormatted = invoice.amount.toFixed(2);
  const safeId = invoice.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
  const pixCode = `00020126580014br.gov.bcb.pix0136d8f1e2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5g520400005303986540${amountFormatted.length < 10 ? '0' : ''}${amountFormatted}5802BR5920CENTRAL ITL TELECOM6009ITAMARAJU62070503${safeId}6304A1B2`;
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`;

  return { pixCode, qrCodeUrl };
}
