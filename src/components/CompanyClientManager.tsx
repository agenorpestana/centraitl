import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Camera as CameraIcon,
  Shield,
  Edit2,
  Trash2,
  CheckCircle,
  Search,
  Lock,
  Mail,
  Phone,
  Eye,
  Key,
  Building,
  Sliders,
  Check,
  Radio,
} from 'lucide-react';
import { Company, User, Camera } from '../types';
import { sanitizeUser } from '../lib/security';

interface CompanyClientManagerProps {
  company: Company;
  cameras: Camera[];
  users: User[];
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: User;
}

export const CompanyClientManager: React.FC<CompanyClientManagerProps> = ({
  company,
  cameras,
  users,
  onSaveUser,
  onDeleteUser,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [notification, setNotification] = useState('');

  // Cameras available in this company's quota pool
  const companyCameras = cameras.filter((c) =>
    company.assignedCameraIds?.includes(c.id) || company.assignedCameraIds?.includes('ALL')
  );

  // Clients belonging to this company
  const companyClients = users.filter(
    (u) => u.companyId === company.id || (u.role === 'RESIDENT' && u.companyName === company.name)
  );

  const filteredClients = companyClients.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm))
  );

  const handleOpenNewClient = () => {
    const newUser: Partial<User> = {
      id: `user-client-${Date.now().toString().slice(-5)}`,
      name: '',
      email: '',
      phone: '',
      role: 'RESIDENT',
      status: 'ACTIVE',
      companyId: company.id,
      companyName: company.name,
      allowedCameraIds: companyCameras.length > 0 ? [companyCameras[0].id] : [],
      customPermissions: {
        canViewLive: true,
        canViewRecordings: true,
        canControlPTZ: false,
        canUseTwoWayAudio: false,
        canManageCameras: false,
        canDeleteRecordings: false,
        canAccessAuditLogs: false,
        canManageUsers: false,
        canExportReports: false,
      },
      lastActive: 'Nunca',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPasswordInput('');
    setEditingUser(newUser);
    setIsModalOpen(true);
  };

  const handleOpenEditClient = (user: User) => {
    setEditingUser(JSON.parse(JSON.stringify(user)));
    setPasswordInput('');
    setIsModalOpen(true);
  };

  const handleToggleCameraForClient = (camId: string) => {
    if (!editingUser) return;
    const current = editingUser.allowedCameraIds || [];
    let updated: string[];
    if (current.includes(camId)) {
      updated = current.filter((id) => id !== camId);
    } else {
      updated = [...current, camId];
    }
    setEditingUser({ ...editingUser, allowedCameraIds: updated });
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name || !editingUser.email) return;

    const userToSave: User = {
      ...(editingUser as User),
      companyId: company.id,
      companyName: company.name,
      role: editingUser.role || 'RESIDENT',
      status: editingUser.status || 'ACTIVE',
      allowedCameraIds: editingUser.allowedCameraIds || [],
    };

    if (passwordInput.trim()) {
      userToSave.password = passwordInput.trim();
    }

    onSaveUser(userToSave);
    setIsModalOpen(false);
    setNotification(`Cliente "${userToSave.name}" atualizado com sucesso.`);
    setTimeout(() => setNotification(''), 4000);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Company Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-12 max-w-[160px] object-contain rounded-xl bg-slate-950/80 p-2 border border-slate-800"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
                <Building className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{company.name}</h1>
                <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold rounded-full uppercase">
                  Painel da Empresa
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gerencie seus clientes e defina o acesso individual às câmeras da sua cota
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenNewClient}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 transition transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar Novo Cliente
            </button>
          </div>
        </div>

        {/* Quota KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Cota de Câmeras</span>
              <span className="text-lg font-bold text-slate-100">
                {companyCameras.length} <span className="text-xs text-slate-500 font-normal">/ {company.maxCameras} alocadas</span>
              </span>
            </div>
            <CameraIcon className="w-6 h-6 text-rose-400/80" />
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Clientes Cadastrados</span>
              <span className="text-lg font-bold text-slate-100">{companyClients.length}</span>
            </div>
            <Users className="w-6 h-6 text-emerald-400/80" />
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Status da Empresa</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                <CheckCircle className="w-4 h-4" /> Ativa & Conectada
              </span>
            </div>
            <Shield className="w-6 h-6 text-sky-400/80" />
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Clients Management List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400" /> Clientes e Moradores da Empresa
            </h2>
            <p className="text-xs text-slate-400">
              Cada cliente só terá acesso de visualização às câmeras marcadas para ele
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar cliente por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-9 pr-3 py-1.5 rounded-xl text-xs outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-600" />
            <h4 className="text-xs font-bold text-slate-300">Nenhum cliente cadastrado nesta empresa</h4>
            <p className="text-xs text-slate-500">
              Clique no botão "Cadastrar Novo Cliente" para adicionar moradores e definir suas câmeras.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Cliente / Usuário</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Câmeras Autorizadas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredClients.map((client) => {
                  const allowedCount = client.allowedCameraIds?.includes('ALL')
                    ? companyCameras.length
                    : client.allowedCameraIds?.length || 0;

                  return (
                    <tr key={client.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-rose-400">
                            {client.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 block">{client.name}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{client.role.toLowerCase()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{client.email}</td>
                      <td className="py-3 px-4 text-slate-400">{client.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px]">
                          {allowedCount} de {companyCameras.length} câmera(s)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            client.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {client.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditClient(client)}
                            title="Editar cliente e permissões de câmeras"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja remover o cliente ${client.name}?`)) {
                                onDeleteUser(client.id);
                              }
                            }}
                            title="Excluir cliente"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Client Creation / Editing */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {editingUser.id && users.some((u) => u.id === editingUser.id)
                      ? `Editar Cliente: ${editingUser.name}`
                      : 'Cadastrar Novo Cliente na Empresa'}
                  </h3>
                  <span className="text-[11px] text-slate-400">Empresa: {company.name}</span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome Completo:*</label>
                  <input
                    type="text"
                    required
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email de Acesso:*</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="joao@email.com"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp:</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    placeholder="+55 73 99999-0000"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Senha de Acesso {editingUser.id && users.some((u) => u.id === editingUser.id) ? '(Opcional se manter)' : ':*'}
                  </label>
                  <input
                    type="password"
                    required={!users.some((u) => u.id === editingUser.id)}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Cameras Assignment */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 block text-xs">
                    Definir Câmeras para este Cliente ({editingUser.allowedCameraIds?.length || 0} selecionada(s))
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = companyCameras.map((c) => c.id);
                      setEditingUser({ ...editingUser, allowedCameraIds: allIds });
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Selecionar Todas da Empresa
                  </button>
                </div>

                {companyCameras.length === 0 ? (
                  <p className="text-slate-500 text-[11px]">
                    Nenhuma câmera foi alocada para esta empresa pelo Administrador Geral ainda.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                    {companyCameras.map((cam) => {
                      const isChecked = editingUser.allowedCameraIds?.includes(cam.id);
                      return (
                        <label
                          key={cam.id}
                          onClick={() => handleToggleCameraForClient(cam.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-rose-500/10 border-rose-500/40 text-slate-100'
                              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                              isChecked ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-700 bg-slate-950'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span className="truncate font-medium">{cam.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status and permissions */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.status === 'ACTIVE'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })}
                    className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-rose-500"
                  />
                  <span>Cliente com Acesso Ativo</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition shadow-lg shadow-rose-500/20"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
