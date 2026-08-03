import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Lock,
  Trash2,
  Camera as CameraIcon,
  Check,
  Eye,
  Sliders,
  X,
  Edit2,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { User, UserRole, CustomPermissions, Camera } from '../types';

interface UserManagementProps {
  users: User[];
  cameras: Camera[];
  activeUser: User;
  onAddUser: (userData: Partial<User>) => void;
  onUpdateUser: (id: string, userData: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

interface IbgeUF {
  sigla: string;
  nome: string;
}

interface IbgeCity {
  id: number;
  nome: string;
}

const FALLBACK_UFS: IbgeUF[] = [
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'GO', nome: 'Goiás' },
];

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  cameras,
  activeUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCameraAccessUser, setEditingCameraAccessUser] = useState<User | null>(null);

  const [ufs, setUfs] = useState<IbgeUF[]>(FALLBACK_UFS);
  const [formCities, setFormCities] = useState<IbgeCity[]>([]);
  const [editCities, setEditCities] = useState<IbgeCity[]>([]);
  const [loadingFormCities, setLoadingFormCities] = useState(false);
  const [loadingEditCities, setLoadingEditCities] = useState(false);

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    role: 'RESIDENT' as UserRole,
    phone: '',
    stateUf: 'BA',
    city: 'Itamaraju',
    allowedCameraIds: ['ALL'] as string[],
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
    } as CustomPermissions,
  });

  // Fetch IBGE UFs on mount
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUfs(data.map((item: any) => ({ sigla: item.sigla, nome: item.nome })));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Cities for Form UF
  useEffect(() => {
    if (!formState.stateUf) return;
    setLoadingFormCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formState.stateUf}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data) => {
        setLoadingFormCities(false);
        if (Array.isArray(data) && data.length > 0) {
          setFormCities(data);
        }
      })
      .catch(() => setLoadingFormCities(false));
  }, [formState.stateUf]);

  // Fetch Cities for Edit Modal UF
  useEffect(() => {
    if (!editingUser?.stateUf) return;
    setLoadingEditCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${editingUser.stateUf}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data) => {
        setLoadingEditCities(false);
        if (Array.isArray(data) && data.length > 0) {
          setEditCities(data);
        }
      })
      .catch(() => setLoadingEditCities(false));
  }, [editingUser?.stateUf]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser.customPermissions.canManageUsers) {
      alert('Sua conta não tem permissão para gerenciar usuários.');
      return;
    }
    if (!formState.name || !formState.email) {
      alert('Nome e Email são obrigatórios');
      return;
    }

    onAddUser({
      ...formState,
      allowedCameraIds: formState.allowedCameraIds.length === 0 ? ['ALL'] : formState.allowedCameraIds,
    });

    setShowAddModal(false);
    setFormState({
      name: '',
      email: '',
      role: 'RESIDENT',
      phone: '',
      stateUf: 'BA',
      city: 'Itamaraju',
      allowedCameraIds: ['ALL'],
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
    });
  };

  const handleUpdateEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editingUser.name || !editingUser.email) {
      alert('Nome e Email são obrigatórios');
      return;
    }

    onUpdateUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      phone: editingUser.phone,
      stateUf: editingUser.stateUf || 'BA',
      city: editingUser.city || 'Itamaraju',
      allowedCameraIds: (editingUser.allowedCameraIds || []).length === 0 ? ['ALL'] : editingUser.allowedCameraIds,
      customPermissions: editingUser.customPermissions,
    });

    setEditingUser(null);
  };

  const handleTogglePermission = (key: keyof CustomPermissions, targetUser?: User) => {
    if (targetUser) {
      const updatedPermissions = {
        ...targetUser.customPermissions,
        [key]: !targetUser.customPermissions[key],
      };
      onUpdateUser(targetUser.id, { customPermissions: updatedPermissions });
    } else {
      setFormState({
        ...formState,
        customPermissions: {
          ...formState.customPermissions,
          [key]: !formState.customPermissions[key],
        },
      });
    }
  };

  const handleToggleFormCamera = (camId: string) => {
    let current = [...formState.allowedCameraIds];

    if (camId === 'ALL') {
      if (current.includes('ALL')) {
        // Uncheck ALL -> switch to all camera IDs or first camera so user can unselect
        setFormState({ ...formState, allowedCameraIds: cameras.map((c) => c.id) });
      } else {
        setFormState({ ...formState, allowedCameraIds: ['ALL'] });
      }
      return;
    }

    if (current.includes('ALL')) {
      // Convert ALL to list of all cameras except the toggled one
      current = cameras.map((c) => c.id).filter((id) => id !== camId);
    } else if (current.includes(camId)) {
      current = current.filter((id) => id !== camId);
    } else {
      current.push(camId);
    }

    setFormState({ ...formState, allowedCameraIds: current.length === 0 ? ['ALL'] : current });
  };

  const handleToggleUserCameraAccess = (user: User, camId: string) => {
    let current = [...(user.allowedCameraIds || ['ALL'])];
    const isAll = current.includes('ALL');

    if (camId === 'ALL') {
      if (isAll) {
        // Uncheck ALL -> switch to list of all cameras so user can select/deselect individually
        const updated = cameras.map((c) => c.id);
        onUpdateUser(user.id, { allowedCameraIds: updated });
      } else {
        onUpdateUser(user.id, { allowedCameraIds: ['ALL'] });
      }
      return;
    }

    if (isAll) {
      current = cameras.map((c) => c.id).filter((id) => id !== camId);
    } else if (current.includes(camId)) {
      current = current.filter((id) => id !== camId);
    } else {
      current.push(camId);
    }

    onUpdateUser(user.id, { allowedCameraIds: current.length === 0 ? ['ALL'] : current });
  };

  const handleToggleEditModalCamera = (camId: string) => {
    if (!editingUser) return;
    let current = [...(editingUser.allowedCameraIds || ['ALL'])];
    const isAll = current.includes('ALL');

    if (camId === 'ALL') {
      if (isAll) {
        current = cameras.map((c) => c.id);
      } else {
        current = ['ALL'];
      }
    } else {
      if (isAll) {
        current = cameras.map((c) => c.id).filter((id) => id !== camId);
      } else if (current.includes(camId)) {
        current = current.filter((id) => id !== camId);
      } else {
        current.push(camId);
      }
    }

    setEditingUser({
      ...editingUser,
      allowedCameraIds: current.length === 0 ? ['ALL'] : current,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Acesso Multiusuário com Seleção de Câmeras Autorizadas
          </h2>
          <p className="text-xs text-slate-400">
            Defina perfis, permissões granulares e escolha exatamente quais câmeras cada usuário pode visualizar
          </p>
        </div>

        {activeUser.customPermissions.canManageUsers && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-lg shadow-emerald-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <form onSubmit={handleCreate} className="bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl space-y-4 shadow-2xl">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <UserPlus className="w-4 h-4" /> Cadastrar Usuário e Vincular Câmeras
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nome Completo:</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Email:</label>
              <input
                type="email"
                placeholder="joao@email.com"
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Perfil de Acesso (Função):</label>
              <select
                value={formState.role}
                onChange={(e) => setFormState({ ...formState, role: e.target.value as UserRole })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              >
                <option value="ADMIN">ADMINISTRADOR (Acesso Total)</option>
                <option value="OPERATOR">OPERADOR (Portaria/Central)</option>
                <option value="GUARD">RONDA / SEGURANÇA</option>
                <option value="RESIDENT">MORADOR / VIZINHO</option>
                <option value="VIEWER">VISUALIZADOR</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Telefone / WhatsApp:</label>
              <input
                type="text"
                placeholder="+55 73 99999-9999"
                value={formState.phone}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Estado (UF):</label>
              <select
                value={formState.stateUf}
                onChange={(e) => setFormState({ ...formState, stateUf: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
              >
                {ufs.map((uf) => (
                  <option key={uf.sigla} value={uf.sigla}>
                    {uf.nome} ({uf.sigla})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Cidade:</label>
              <select
                value={formState.city}
                onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
                disabled={loadingFormCities}
              >
                {loadingFormCities ? (
                  <option value="">Carregando IBGE...</option>
                ) : formCities.length > 0 ? (
                  formCities.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                    </option>
                  ))
                ) : (
                  <option value={formState.city}>{formState.city}</option>
                )}
              </select>
            </div>
          </div>

          {/* Camera Selection Section */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <CameraIcon className="w-4 h-4 text-emerald-400" /> Câmeras Autorizadas para este Usuário:
              </span>
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <input
                  type="checkbox"
                  checked={formState.allowedCameraIds.includes('ALL')}
                  onChange={() => handleToggleFormCamera('ALL')}
                  className="accent-emerald-500 rounded"
                />
                <span>Acesso Total (Todas as Câmeras)</span>
              </label>
            </div>

            {!formState.allowedCameraIds.includes('ALL') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs pt-1">
                {cameras.map((cam) => {
                  const isChecked = formState.allowedCameraIds.includes(cam.id);
                  return (
                    <label
                      key={cam.id}
                      className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFormCamera(cam.id)}
                        className="accent-emerald-500 rounded"
                      />
                      <div className="truncate text-xs">
                        <div className="font-bold">{cam.name}</div>
                        <div className="text-[10px] text-slate-500">{cam.location}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Granular Permission Toggles */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <p className="text-xs font-bold text-slate-200">Matriz de Permissões Granulares:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-300">
              {Object.entries({
                canViewLive: 'Ver Câmeras ao Vivo',
                canViewRecordings: 'Ver Gravações na Nuvem',
                canControlPTZ: 'Controle de Câmeras PTZ',
                canUseTwoWayAudio: 'Áudio Bidirecional (RTMP)',
                canManageCameras: 'Adicionar/Excluir Câmeras',
                canDeleteRecordings: 'Excluir Gravações',
                canAccessAuditLogs: 'Acessar Logs de Auditoria',
                canManageUsers: 'Gerenciar Usuários',
                canExportReports: 'Exportar Relatórios',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <input
                    type="checkbox"
                    checked={(formState.customPermissions as any)[key]}
                    onChange={() => handleTogglePermission(key as any)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-emerald-400"
            >
              Salvar Usuário
            </button>
          </div>
        </form>
      )}

      {/* Users List & Permissions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200">Usuários Cadastrados ({users.length})</h3>
          <span className="text-[10px] text-slate-400 font-mono">Autenticação Criptografada HTTPS/WSS</span>
        </div>

        <div className="divide-y divide-slate-800">
          {users.map((user) => {
            const isSuperUser =
              user.email === 'suporte@unityautomacoes.com.br' ||
              user.id === 'user-superadmin-01' ||
              (user.role as string) === 'SUPER_ADMIN';

            const isAllCameras = !user.allowedCameraIds || user.allowedCameraIds.includes('ALL');
            const allowedCount = isAllCameras
              ? cameras.length
              : (user.allowedCameraIds || []).filter((id) => cameras.some((c) => c.id === id)).length;

            return (
              <div key={user.id} className="p-4 hover:bg-slate-800/40 transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <img src={user.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30" />
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        {user.name}
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                          {user.role}
                        </span>
                        {isSuperUser && (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            ★ SUPER USUÁRIO PROTEGIDO
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{user.email}</span>
                        {(user.city || user.stateUf) && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-sans">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {user.city || 'Cidade N/D'}{user.stateUf ? ` - ${user.stateUf}` : ''}
                          </span>
                        )}
                        {(user.planName || user.chosenDueDay) && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 font-sans">
                            <DollarSign className="w-3 h-3 text-cyan-400" />
                            {user.planName || 'Plano Residencial'} (Venc. Dia {user.chosenDueDay || 5})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400">
                    <button
                      onClick={() => setEditingCameraAccessUser(editingCameraAccessUser?.id === user.id ? null : user)}
                      className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 rounded-lg flex items-center space-x-1.5 transition"
                      title="Alterar Câmeras Autorizadas"
                    >
                      <CameraIcon className="w-3 h-3 text-emerald-400" />
                      <span>
                        Câmeras: {isAllCameras ? 'Todas (Acesso Total)' : `${allowedCount} de ${cameras.length}`}
                      </span>
                    </button>

                    <span>Ativo: {user.lastActive}</span>

                    {/* Hide Edit & Delete for Super User */}
                    {!isSuperUser && activeUser.customPermissions.canManageUsers && (
                      <button
                        onClick={() => setEditingUser(user)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg flex items-center space-x-1 transition"
                        title="Editar Dados do Usuário"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    )}

                    {!isSuperUser && activeUser.customPermissions.canManageUsers && user.role !== 'ADMIN' && (
                      <button
                        onClick={() => {
                          if (confirm(`Excluir usuário ${user.name}?`)) onDeleteUser(user.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Individual Camera Access Editor Box */}
                {editingCameraAccessUser?.id === user.id && (
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-2 animate-fadeIn text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" /> Selecionar Câmeras Permitidas para {user.name}:
                      </span>
                      <button
                        onClick={() => handleToggleUserCameraAccess(user, 'ALL')}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition ${
                          isAllCameras
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Acesso Total
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {cameras.map((cam) => {
                        const isPermitted = isAllCameras || (user.allowedCameraIds || []).includes(cam.id);
                        return (
                          <label
                            key={cam.id}
                            className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                              isPermitted
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isPermitted}
                              onChange={() => handleToggleUserCameraAccess(user, cam.id)}
                              className="accent-emerald-500 rounded"
                            />
                            <span className="truncate">{cam.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Permission Checkboxes */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex flex-wrap gap-2 text-[11px]">
                  {Object.entries({
                    canViewLive: 'Ao Vivo',
                    canViewRecordings: 'Gravações',
                    canControlPTZ: 'PTZ',
                    canUseTwoWayAudio: 'Áudio RTMP',
                    canManageCameras: 'Câmeras',
                    canDeleteRecordings: 'Excluir',
                    canAccessAuditLogs: 'Logs',
                    canManageUsers: 'Usuários',
                  }).map(([key, label]) => {
                    const hasPerm = (user.customPermissions as any)[key];
                    return (
                      <button
                        key={key}
                        onClick={() => activeUser.customPermissions.canManageUsers && handleTogglePermission(key as any, user)}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-medium transition ${
                          hasPerm
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        {hasPerm ? '✓' : '✕'} {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit User Modal Overlay */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 my-8">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Editar Usuário: {editingUser.name}</h3>
                <p className="text-xs text-slate-400">Atualize os dados, função e câmeras autorizadas para este usuário.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateEditUserSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nome Completo:</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">E-mail de Acesso:</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Função (Role):</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none focus:border-emerald-500"
                  >
                    <option value="RESIDENT">Morador / Cliente (Padrão)</option>
                    <option value="OPERATOR">Operador de Monitoramento</option>
                    <option value="GUARD">Guarda de Segurança / Vigilante</option>
                    <option value="ADMIN">Administrador Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Telefone / WhatsApp:</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none focus:border-emerald-500"
                    placeholder="+55 73 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estado (UF):</label>
                  <select
                    value={editingUser.stateUf || 'BA'}
                    onChange={(e) => setEditingUser({ ...editingUser, stateUf: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none focus:border-emerald-500"
                  >
                    {ufs.map((uf) => (
                      <option key={uf.sigla} value={uf.sigla}>
                        {uf.nome} ({uf.sigla})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Cidade:</label>
                  <select
                    value={editingUser.city || 'Itamaraju'}
                    onChange={(e) => setEditingUser({ ...editingUser, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none focus:border-emerald-500"
                    disabled={loadingEditCities}
                  >
                    {loadingEditCities ? (
                      <option value="">Carregando IBGE...</option>
                    ) : editCities.length > 0 ? (
                      editCities.map((c) => (
                        <option key={c.id} value={c.nome}>
                          {c.nome}
                        </option>
                      ))
                    ) : (
                      <option value={editingUser.city || 'Itamaraju'}>{editingUser.city || 'Itamaraju'}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Camera Selection */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <CameraIcon className="w-4 h-4 text-emerald-400" /> Câmeras Permitidas:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleEditModalCamera('ALL')}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded border transition ${
                      !editingUser.allowedCameraIds || editingUser.allowedCameraIds.includes('ALL')
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {!editingUser.allowedCameraIds || editingUser.allowedCameraIds.includes('ALL')
                      ? '✓ Acesso Total Ativado'
                      : 'Ativar Acesso Total'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 pt-1">
                  {cameras.map((cam) => {
                    const isAll = !editingUser.allowedCameraIds || editingUser.allowedCameraIds.includes('ALL');
                    const isChecked = isAll || editingUser.allowedCameraIds?.includes(cam.id);

                    return (
                      <label
                        key={cam.id}
                        className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEditModalCamera(cam.id)}
                          className="accent-emerald-500 rounded"
                        />
                        <span className="truncate">{cam.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Custom Permissions */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-medium">Permissões Especiais de Controle:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries({
                    canViewLive: 'Ver Câmeras Ao Vivo',
                    canViewRecordings: 'Acessar Gravações em Nuvem',
                    canControlPTZ: 'Controle de Câmeras PTZ',
                    canUseTwoWayAudio: 'Áudio Bidirecional',
                    canManageCameras: 'Cadastrar / Alterar Câmeras',
                    canDeleteRecordings: 'Excluir Gravações',
                    canAccessAuditLogs: 'Visualizar Logs de Auditoria',
                    canManageUsers: 'Gerenciar Usuários',
                    canExportReports: 'Exportar Relatórios PDF',
                  }).map(([key, label]) => {
                    const checked = (editingUser.customPermissions as any)?.[key] || false;
                    return (
                      <label
                        key={key}
                        className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                          checked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setEditingUser({
                              ...editingUser,
                              customPermissions: {
                                ...editingUser.customPermissions,
                                [key]: !checked,
                              },
                            })
                          }
                          className="accent-emerald-500 rounded"
                        />
                        <span className="text-[10px] leading-tight">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-lg hover:bg-emerald-400"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
