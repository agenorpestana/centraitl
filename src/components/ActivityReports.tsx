import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Search,
  Filter,
  BarChart2,
  PieChart as PieChartIcon,
  ShieldCheck,
  Activity,
  HardDrive,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { ActivityLog, User } from '../types';

interface ActivityReportsProps {
  logs: ActivityLog[];
  activeUser: User;
}

export const ActivityReports: React.FC<ActivityReportsProps> = ({ logs, activeUser }) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    if (categoryFilter !== 'ALL' && log.category !== categoryFilter) return false;
    if (
      searchTerm &&
      !log.userName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.action.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Mock hourly motion events data for chart
  const hourlyData = [
    { hour: '00h', alertas: 4, usuarios: 1 },
    { hour: '03h', alertas: 9, usuarios: 2 },
    { hour: '06h', alertas: 15, usuarios: 5 },
    { hour: '09h', alertas: 28, usuarios: 12 },
    { hour: '12h', alertas: 35, usuarios: 18 },
    { hour: '15h', alertas: 42, usuarios: 15 },
    { hour: '18h', alertas: 31, usuarios: 10 },
    { hour: '21h', alertas: 18, usuarios: 6 },
  ];

  const exportCSV = () => {
    const headers = 'ID,DataHora,Usuario,Acao,Categoria,IP\n';
    const rows = filteredLogs
      .map((l) => `"${l.id}","${l.timestamp}","${l.userName}","${l.action}","${l.category}","${l.ipAddress}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-atividades-gabriel-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Relatórios Detalhados de Atividades Diárias & Auditoria
          </h2>
          <p className="text-xs text-slate-400">
            Histórico completo de acessos, eventos de movimento, gravações e alterações no sistema Gabriel
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={exportPDF}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow"
          >
            <FileText className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Alerts Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Volume de Alertas de Movimento por Horário (24h)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Média: 23 alertas/hora</span>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorAlertas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="alertas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAlertas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Summary Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Resumo das Atividades de Hoje
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <p className="text-slate-400 text-[10px]">Total de Logs Auditados</p>
              <p className="text-lg font-bold text-emerald-400">{logs.length}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <p className="text-slate-400 text-[10px]">Disparos de Alerta IA</p>
              <p className="text-lg font-bold text-rose-400">188</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <p className="text-slate-400 text-[10px]">Taxa de Uptime Câmeras</p>
              <p className="text-lg font-bold text-cyan-400">99.98%</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <p className="text-slate-400 text-[10px]">Sessões de Áudio RTMP</p>
              <p className="text-lg font-bold text-amber-400">14 ativas</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-mono text-center">
            Relatórios em conformidade com as normas de auditoria e segurança LGPD / E2EE.
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-200">Logs de Auditoria de Atividades</h3>

          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Buscar por usuário ou ação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1 text-xs rounded-xl outline-none focus:border-emerald-500"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1 text-xs rounded-xl outline-none"
            >
              <option value="ALL">Todas Categorias</option>
              <option value="AUTH">Acesso / Autenticação</option>
              <option value="SYSTEM">Sistema & Alertas</option>
              <option value="RECORDING">Gravações Nuvem</option>
              <option value="AUDIO">Áudio RTMP</option>
              <option value="BACKUP">Backup Semanal</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Usuário</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Endereço IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 text-slate-400">{log.timestamp}</td>
                  <td className="p-3 font-bold text-white">{log.userName}</td>
                  <td className="p-3 text-slate-200">
                    <div>{log.action}</div>
                    {log.details && <div className="text-[10px] text-slate-500">{log.details}</div>}
                  </td>
                  <td className="p-3">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                      {log.category}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
