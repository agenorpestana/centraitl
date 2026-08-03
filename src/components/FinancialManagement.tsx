import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Copy,
  ExternalLink,
  ShieldCheck,
  Settings,
  UserCheck,
  UserX,
  TrendingUp,
  FileText,
  Info,
  RefreshCw,
} from 'lucide-react';
import { User, Invoice, FinancialPlan, MercadoPagoConfig } from '../types';
import {
  calculateSubscriptionBilling,
  generateMercadoPagoPixPayload,
  INITIAL_PLANS,
} from '../lib/financial';

interface FinancialManagementProps {
  currentUser: User;
  users: User[];
  invoices: Invoice[];
  mpConfig: MercadoPagoConfig;
  onUpdateInvoices: (newInvoices: Invoice[]) => void;
  onUpdateUsers: (newUsers: User[]) => void;
  onOpenMpSettings: () => void;
}

export const FinancialManagement: React.FC<FinancialManagementProps> = ({
  currentUser,
  users,
  invoices,
  mpConfig,
  onUpdateInvoices,
  onUpdateUsers,
  onOpenMpSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'>('ALL');
  const [selectedInvoiceForPix, setSelectedInvoiceForPix] = useState<Invoice | null>(null);
  const [isCopyingPix, setIsCopyingPix] = useState(false);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);

  // Form state for new subscriber creation with pro-rata
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(INITIAL_PLANS[0].id);
  const [chosenDueDay, setChosenDueDay] = useState<5 | 10 | 15 | 20>(5);
  const [contractDateStr, setContractDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const selectedPlan = INITIAL_PLANS.find((p) => p.id === selectedPlanId) || INITIAL_PLANS[0];
  const targetUser = users.find((u) => u.id === selectedUserId) || users[0];

  // Calculate live pro-rata calculation
  const billingCalculation = calculateSubscriptionBilling(
    selectedPlan.monthlyPrice,
    chosenDueDay,
    contractDateStr
  );

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.email === 'suporte@unityautomacoes.com.br';

  // KPI Metrics
  const totalRevenuePaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalRevenuePending = invoices
    .filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE')
    .reduce((sum, i) => sum + i.amount, 0);

  const blockedUsersCount = users.filter((u) => u.financialStatus === 'BLOCKED').length;
  const warningUsersCount = users.filter((u) => u.financialStatus === 'WARNING').length;

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && inv.status === statusFilter;
  });

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      await fetch(`/api/financial/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAID',
          paymentDate: new Date().toISOString().split('T')[0],
        }),
      });
    } catch (e) {}

    const updated = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: 'PAID' as const,
          paymentDate: new Date().toISOString().split('T')[0],
        };
      }
      return inv;
    });

    onUpdateInvoices(updated);

    // Also update target user's financial status
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      const updatedUsers = users.map((u) => {
        if (u.id === inv.userId) {
          return {
            ...u,
            financialStatus: 'OK' as const,
            daysOverdue: 0,
          };
        }
        return u;
      });
      try {
        await fetch(`/api/users/${inv.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ financialStatus: 'OK', daysOverdue: 0 }),
        });
      } catch (e) {}
      onUpdateUsers(updatedUsers);
    }

    if (selectedInvoiceForPix?.id === invoiceId) {
      setSelectedInvoiceForPix(null);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    // Create new invoice
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      planName: selectedPlan.name,
      amount: billingCalculation.amount,
      originalAmount: selectedPlan.monthlyPrice,
      dueDate: billingCalculation.dueDate,
      status: 'PENDING',
      isProRata: billingCalculation.isProRata,
      proRataDays: billingCalculation.proRataDays,
      createdAt: new Date().toISOString().split('T')[0],
    };

    try {
      await fetch('/api/financial/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvoice),
      });
    } catch (e) {}

    onUpdateInvoices([newInvoice, ...invoices]);

    // Update User Plan and Due Day
    const updatedUsers = users.map((u) => {
      if (u.id === targetUser.id) {
        return {
          ...u,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          monthlyFee: selectedPlan.monthlyPrice,
          chosenDueDay: chosenDueDay,
          financialStatus: 'OK' as const,
        };
      }
      return u;
    });

    try {
      await fetch(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          monthlyFee: selectedPlan.monthlyPrice,
          chosenDueDay: chosenDueDay,
          financialStatus: 'OK',
        }),
      });
    } catch (e) {}

    onUpdateUsers(updatedUsers);
    setIsCreatingSubscription(false);
  };

  // CLIENT VIEW (Non-admin)
  if (!isAdmin) {
    const myInvoices = invoices.filter((i) => i.userId === currentUser.id);
    const pendingInvoice = myInvoices.find((i) => i.status === 'PENDING' || i.status === 'OVERDUE');

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Minha Assinatura & Financeiro</h2>
              <p className="text-xs text-slate-400">
                Gerencie seu plano de monitoramento, vencimentos e boletos / PIX Mercado Pago.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block font-medium">Plano Ativo</span>
              <span className="text-base font-bold text-white block mt-1">
                {currentUser.planName || 'Plano Residencial Essencial'}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block font-medium">Valor Mensal</span>
              <span className="text-lg font-mono font-bold text-emerald-400 block mt-1">
                R$ {(currentUser.monthlyFee || 49.90).toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block font-medium">Dia Fixo de Vencimento</span>
              <span className="text-base font-mono font-bold text-cyan-400 block mt-1">
                Todo dia {currentUser.chosenDueDay || 5}
              </span>
            </div>
          </div>
        </div>

        {/* Pending Invoice Callout */}
        {pendingInvoice && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">
                  Fatura Aberta em Vencimento
                </span>
                <h3 className="text-xl font-black text-white mt-2">
                  Mensalidade Vencimento {pendingInvoice.dueDate}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Valor a pagar:{' '}
                  <strong className="text-emerald-400 text-lg font-mono">
                    R$ {pendingInvoice.amount.toFixed(2)}
                  </strong>{' '}
                  {pendingInvoice.isProRata && `(Valor Proporcional Pro-rata de ${pendingInvoice.proRataDays} dias)`}
                </p>
              </div>

              <button
                onClick={() => setSelectedInvoiceForPix(pendingInvoice)}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2 shrink-0"
              >
                <QrCode className="w-4 h-4" />
                <span>Pagar com PIX Mercado Pago</span>
              </button>
            </div>
          </div>
        )}

        {/* My Invoices History Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Histórico de Faturas
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Fatura</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {myInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Nenhuma fatura encontrada.
                    </td>
                  </tr>
                ) : (
                  myInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-white">{inv.id}</td>
                      <td className="p-3 font-mono text-slate-200">{inv.dueDate}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        R$ {inv.amount.toFixed(2)}
                      </td>
                      <td className="p-3">
                        {inv.isProRata ? (
                          <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Pro-Rata ({inv.proRataDays}d)
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                            Mensal Normal
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {inv.status === 'PAID' && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> PAGA
                          </span>
                        )}
                        {inv.status === 'PENDING' && (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> PENDENTE
                          </span>
                        )}
                        {inv.status === 'OVERDUE' && (
                          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> ATRASADA
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => setSelectedInvoiceForPix(inv)}
                            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl font-bold transition flex items-center space-x-1 ml-auto"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Pagar PIX</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mercado Pago Payment Modal for Client */}
        {selectedInvoiceForPix && (
          <MercadoPagoCheckoutModal
            invoice={selectedInvoiceForPix}
            mpConfig={mpConfig}
            onClose={() => setSelectedInvoiceForPix(null)}
            onConfirmPay={handlePayInvoice}
          />
        )}
      </div>
    );
  }

  // ADMIN FULL FINANCIAL DASHBOARD
  return (
    <div className="space-y-6">
      {/* Top Banner Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              Gestão Financeira & Cobranças ITL
            </h2>
            <p className="text-xs text-slate-400">
              Controle de faturas, cálculo de pro-rata automatizado e integração Mercado Pago API.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenMpSettings}
            className="px-4 py-2.5 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 rounded-2xl text-xs font-bold transition flex items-center space-x-2 shadow-md"
          >
            <Settings className="w-4 h-4 text-sky-400" />
            <span>Configurar Mercado Pago</span>
          </button>

          <button
            onClick={() => setIsCreatingSubscription(true)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Assinante (Pro-Rata)</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Receita Confirmada</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            R$ {totalRevenuePaid.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500">
            {invoices.filter((i) => i.status === 'PAID').length} fatura(s) quitadas
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Receita Pendente / Aberta</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">
            R$ {totalRevenuePending.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500">
            Aguardando quitação PIX Mercado Pago
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Clientes Alerta (≤5d)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 font-mono">
            {warningUsersCount}
          </p>
          <p className="text-[10px] text-slate-500">Vencimento próximo ou 1-5 dias atraso</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Clientes Bloqueados (&gt;5d)</span>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono">
            {blockedUsersCount}
          </p>
          <p className="text-[10px] text-slate-500">Sistema bloqueado automaticamente</p>
        </div>
      </div>

      {/* Rules Information Box */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-2 text-xs text-slate-300">
        <div className="flex items-center space-x-2 font-bold text-white">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Regras do Módulo Financeiro ITL:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
          <li>
            <strong>Dias Fixos de Vencimento:</strong> Escolha entre <strong>05, 10, 15 ou 20</strong> para cada cliente.
          </li>
          <li>
            <strong>Cálculo Pro-Rata:</strong> Se o intervalo do cadastro até o dia do vencimento for <strong>maior que 5 dias</strong>, cobra-se apenas os dias proporcionais até o primeiro vencimento.
          </li>
          <li>
            <strong>Isenção de Pro-Rata (Intervalo ≤ 5 dias):</strong> Se a diferença for de <strong>5 dias ou menos</strong>, cobra-se a mensalidade normal cheia (ex: R$ 49,90) e o próximo vencimento será prorrogado para o mês seguinte.
          </li>
          <li>
            <strong>Notificações e Bloqueio:</strong> Alerta com <strong>5 dias de antecedência</strong> do vencimento. Se atrasar mais de <strong>5 dias após o vencimento</strong>, o sistema é bloqueado automaticamente!
          </li>
        </ul>
      </div>

      {/* Invoices Table Header & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Faturas e Lançamentos
          </h3>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar cliente, email, id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 pl-9 pr-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'PENDING' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setStatusFilter('OVERDUE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'OVERDUE' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Atrasadas
              </button>
              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pagas
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">ID / Data</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Nenhuma fatura encontrada.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono">
                      <div className="font-bold text-white">{inv.id}</div>
                      <div className="text-[10px] text-slate-500">{inv.createdAt}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-200">{inv.userName}</div>
                      <div className="text-[10px] text-slate-400">{inv.userEmail}</div>
                    </td>
                    <td className="p-3 text-slate-300">{inv.planName}</td>
                    <td className="p-3 font-mono font-bold text-cyan-300">{inv.dueDate}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      R$ {inv.amount.toFixed(2)}
                      {inv.isProRata && (
                        <div className="text-[9px] text-slate-400 font-normal">
                          Base: R$ {inv.originalAmount.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {inv.isProRata ? (
                        <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          Pro-Rata ({inv.proRataDays}d)
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                          Mensal Normal
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {inv.status === 'PAID' && (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> PAGA ({inv.paymentDate})
                        </span>
                      )}
                      {inv.status === 'PENDING' && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" /> PENDENTE
                        </span>
                      )}
                      {inv.status === 'OVERDUE' && (
                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> ATRASADA
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedInvoiceForPix(inv)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg transition"
                          title="Ver QR Code PIX Mercado Pago"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => handlePayInvoice(inv.id)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px] transition flex items-center space-x-1"
                            title="Dar Baixa Manual de Pagamento"
                          >
                            <Check className="w-3 h-3" />
                            <span>Dar Baixa</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SUBSCRIPTION / PLAN MODAL */}
      {isCreatingSubscription && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-auto text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Plano com Cálculo Pro-Rata</h3>
                  <p className="text-xs text-slate-400">
                    Selecione o cliente, plano e dia fixo de vencimento (05, 10, 15, 20).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreatingSubscription(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="space-y-4">
              {/* Select Client */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Cliente / Usuário:</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs p-3 rounded-xl outline-none focus:border-emerald-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Plano de Monitoramento:</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs p-3 rounded-xl outline-none focus:border-emerald-500"
                >
                  {INITIAL_PLANS.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — R$ {plan.monthlyPrice.toFixed(2)}/mês
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Fixed Due Day */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Dia Fixo de Vencimento:
                  </label>
                  <select
                    value={chosenDueDay}
                    onChange={(e) => setChosenDueDay(Number(e.target.value) as 5 | 10 | 15 | 20)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs font-bold p-3 rounded-xl outline-none focus:border-emerald-500"
                  >
                    <option value={5}>Todo dia 05</option>
                    <option value={10}>Todo dia 10</option>
                    <option value={15}>Todo dia 15</option>
                    <option value={20}>Todo dia 20</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Data da Contratação:
                  </label>
                  <input
                    type="date"
                    value={contractDateStr}
                    onChange={(e) => setContractDateStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono p-3 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Calculated Pro-Rata Live Result Preview */}
              <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400 font-medium">Resultado do Cálculo ITL:</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {billingCalculation.isProRata ? 'COBRANÇA PRO-RATA' : 'COBRANÇA MENSAL NORMAL'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-300 font-semibold">Primeira Fatura:</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    R$ {billingCalculation.amount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">Data do Primeiro Vencimento:</span>
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    {billingCalculation.dueDate}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 leading-relaxed">
                  💡 {billingCalculation.explanation}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingSubscription(false)}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 transition"
                >
                  Gerar Assinatura & Fatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mercado Pago Payment Checkout Modal (PIX + Credit Card) */}
      {selectedInvoiceForPix && (
        <MercadoPagoCheckoutModal
          invoice={selectedInvoiceForPix}
          mpConfig={mpConfig}
          onClose={() => setSelectedInvoiceForPix(null)}
          onConfirmPay={handlePayInvoice}
        />
      )}
    </div>
  );
};

// Mercado Pago Production Checkout Popup Modal (PIX & Credit Card)
interface MercadoPagoCheckoutModalProps {
  invoice: Invoice;
  mpConfig: MercadoPagoConfig;
  onClose: () => void;
  onConfirmPay: (invoiceId: string) => void;
}

const MercadoPagoCheckoutModal: React.FC<MercadoPagoCheckoutModalProps> = ({
  invoice,
  mpConfig,
  onClose,
  onConfirmPay,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccess, setCardSuccess] = useState<string | null>(null);

  // Credit Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(invoice.userName || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [installments, setInstallments] = useState(1);

  const { pixCode, qrCodeUrl } = generateMercadoPagoPixPayload(invoice);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleProcessCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError(null);
    setCardSuccess(null);

    if (cardNumber.replace(/\s/g, '').length < 13) {
      setCardError('Número do cartão inválido.');
      return;
    }
    if (!cardExpiry.includes('/') || cardExpiry.length < 5) {
      setCardError('Data de validade inválida (formato MM/AA).');
      return;
    }
    if (cardCvv.length < 3) {
      setCardError('Código CVV inválido.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/payments/mercadopago/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          paymentMethod: 'credit_card',
          amount: invoice.amount,
          userEmail: invoice.userEmail,
          userName: invoice.userName,
          cardData: {
            cardNumber: cardNumber.replace(/\s/g, ''),
            cardHolder,
            cardExpiry,
            cardCvv,
            docNumber,
            installments,
          },
          mpConfig,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCardSuccess('Pagamento com Cartão APROVADO via Mercado Pago!');
        setTimeout(() => {
          onConfirmPay(invoice.id);
        }, 1500);
      } else {
        setCardError(data.error || 'Erro ao processar pagamento com cartão no Mercado Pago.');
      }
    } catch (e: any) {
      setCardError('Falha na comunicação com o servidor de pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl text-slate-100 my-auto animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Pagamento Mercado Pago</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center space-y-1">
          <p className="text-xs text-slate-400">Cliente: <strong className="text-white">{invoice.userName}</strong> ({invoice.planName})</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            R$ {invoice.amount.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">Vencimento: {invoice.dueDate}</p>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPaymentMethod('pix')}
            className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition ${
              paymentMethod === 'pix'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>PIX Instantâneo</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('credit_card')}
            className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition ${
              paymentMethod === 'credit_card'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Cartão de Crédito</span>
          </button>
        </div>

        {/* TAB 1: PIX Mercado Pago */}
        {paymentMethod === 'pix' && (
          <div className="space-y-4 animate-in fade-in">
            {/* QR Code */}
            <div className="bg-white p-3 rounded-2xl max-w-[190px] mx-auto shadow-lg">
              <img src={qrCodeUrl} alt="QR Code PIX" className="w-full h-auto" />
            </div>

            {/* PIX Copy & Paste Payload */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-semibold block">PIX Copia e Cola:</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={pixCode}
                  className="w-full bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-300 p-2.5 pr-10 rounded-xl outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && <p className="text-[10px] text-emerald-400 font-bold">Copiado para a área de transferência!</p>}
            </div>

            <div className="space-y-2 pt-1">
              {invoice.status !== 'PAID' && (
                <button
                  type="button"
                  onClick={() => onConfirmPay(invoice.id)}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Pagamento PIX (Baixa Instantânea)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Cartão de Crédito Mercado Pago */}
        {paymentMethod === 'credit_card' && (
          <form onSubmit={handleProcessCardPayment} className="space-y-3 animate-in fade-in">
            <div>
              <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                Número do Cartão:
              </label>
              <input
                type="text"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono p-2.5 rounded-xl outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                Nome do Titular (como no cartão):
              </label>
              <input
                type="text"
                placeholder="NOME COMPLETO"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Validade (MM/AA):
                </label>
                <input
                  type="text"
                  placeholder="12/28"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                    setCardExpiry(val);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono p-2.5 rounded-xl outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Código (CVV):
                </label>
                <input
                  type="text"
                  placeholder="123"
                  maxLength={4}
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono p-2.5 rounded-xl outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  CPF / CNPJ do Titular:
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono p-2.5 rounded-xl outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Parcelas:
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500"
                >
                  <option value={1}>1x R$ {invoice.amount.toFixed(2)} (À vista)</option>
                  <option value={2}>2x R$ {(invoice.amount / 2).toFixed(2)}</option>
                  <option value={3}>3x R$ {(invoice.amount / 3).toFixed(2)}</option>
                  <option value={6}>6x R$ {(invoice.amount / 6).toFixed(2)}</option>
                  <option value={12}>12x R$ {(invoice.amount / 12).toFixed(2)}</option>
                </select>
              </div>
            </div>

            {cardError && (
              <p className="text-[11px] text-rose-400 font-semibold flex items-center gap-1 bg-rose-950/40 p-2 rounded-lg border border-rose-500/30">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {cardError}
              </p>
            )}

            {cardSuccess && (
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {cardSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando Cartão no Mercado Pago...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pagar R$ {invoice.amount.toFixed(2)} com Cartão</span>
                </>
              )}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
