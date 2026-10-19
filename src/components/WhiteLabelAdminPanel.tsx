import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Camera as CameraIcon,
  Palette,
  Shield,
  Check,
  Search,
  ExternalLink,
  Users,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Company, Camera, User, WhiteLabelConfig } from '../types';
import { DEFAULT_ITL_WHITELABEL } from '../lib/whitelabel';
import { getAuthHeaders } from '../lib/security';

interface WhiteLabelAdminPanelProps {
  companies: Company[];
  cameras: Camera[];
  users: User[];
  onSaveCompany: (company: Company) => void;
  onDeleteCompany: (companyId: string) => void;
  activeCompanyId?: string;
  onSelectCompanyPreview?: (company: Company | null) => void;
  globalConfig: WhiteLabelConfig;
  onSaveGlobalConfig: (config: WhiteLabelConfig) => void;
}

export const WhiteLabelAdminPanel: React.FC<WhiteLabelAdminPanelProps> = ({
  companies,
  cameras,
  users,
  onSaveCompany,
  onDeleteCompany,
  activeCompanyId,
  onSelectCompanyPreview,
  globalConfig,
  onSaveGlobalConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'companies' | 'default-branding'>('companies');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [themeModePreview, setThemeModePreview] = useState<'light' | 'dark'>('dark');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState('');

  // Default branding form state
  const [defaultName, setDefaultName] = useState(globalConfig.name || DEFAULT_ITL_WHITELABEL.name);
  const [defaultLogoUrl, setDefaultLogoUrl] = useState(globalConfig.logoUrl || DEFAULT_ITL_WHITELABEL.logoUrl);
  const [defaultLightColors, setDefaultLightColors] = useState(globalConfig.colors?.light || DEFAULT_ITL_WHITELABEL.colors.light);
  const [defaultDarkColors, setDefaultDarkColors] = useState(globalConfig.colors?.dark || DEFAULT_ITL_WHITELABEL.colors.dark);

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cnpj && c.cnpj.includes(searchTerm)) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenNewCompany = () => {
    const newComp: Company = {
      id: `empresa-${Date.now().toString().slice(-6)}`,
      name: '',
      cnpj: '',
      email: '',
      phone: '',
      maxCameras: 10,
      assignedCameraIds: [],
      logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=300&h=100&auto=format&fit=crop&q=80',
      colors: {
        light: { ...DEFAULT_ITL_WHITELABEL.colors.light },
        dark: { ...DEFAULT_ITL_WHITELABEL.colors.dark },
      },
      status: 'ACTIVE',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEditingCompany(newComp);
    setIsModalOpen(true);
  };

  const handleOpenEditCompany = (company: Company) => {
    setEditingCompany(JSON.parse(JSON.stringify(company)));
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editingCompany.name.trim()) return;

    onSaveCompany(editingCompany);
    setIsModalOpen(false);
    setSaveSuccessNotice(`Empresa "${editingCompany.name}" salva com sucesso!`);
    setTimeout(() => setSaveSuccessNotice(''), 4000);
  };

  const handleToggleCameraAssignment = (camId: string) => {
    if (!editingCompany) return;
    const current = editingCompany.assignedCameraIds || [];
    let updated: string[];
    if (current.includes(camId)) {
      updated = current.filter((id) => id !== camId);
    } else {
      if (current.length >= editingCompany.maxCameras) {
        alert(`Limite de cota atingido (${editingCompany.maxCameras} câmeras). Aumente a cota para adicionar mais câmeras.`);
        return;
      }
      updated = [...current, camId];
    }
    setEditingCompany({ ...editingCompany, assignedCameraIds: updated });
  };

  const handleSaveDefaultBranding = () => {
    const updated: WhiteLabelConfig = {
      id: globalConfig.id || 'itl-default',
      name: defaultName,
      logoUrl: defaultLogoUrl,
      colors: {
        light: defaultLightColors,
        dark: defaultDarkColors,
      },
    };
    onSaveGlobalConfig(updated);
    setSaveSuccessNotice('Configurações de identidade visual padrão salvas com sucesso!');
    setTimeout(() => setSaveSuccessNotice(''), 4000);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestão Multi-Empresas (White Label)</h1>
              <p className="text-xs text-slate-400">
                Cadastre empresas parceiras, personalize logo, paleta de cores Light/Dark e delegue cotas de câmeras
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'companies'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Empresas Cadastradas ({companies.length})
            </button>
            <button
              onClick={() => setActiveTab('default-branding')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'default-branding'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Identidade Padrão (ITL)
            </button>
          </div>

          {activeTab === 'companies' && (
            <button
              onClick={handleOpenNewCompany}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nova Empresa
            </button>
          )}
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'companies' ? (
        <div className="space-y-4">
          {/* Search bar & statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nome da empresa, CNPJ ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-rose-500 transition"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-400 block">Total de Empresas</span>
                <span className="text-lg font-bold text-slate-100">{companies.length}</span>
              </div>
              <Building2 className="w-6 h-6 text-rose-400/60" />
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-400 block">Câmeras Alocadas</span>
                <span className="text-lg font-bold text-slate-100">
                  {companies.reduce((acc, c) => acc + (c.assignedCameraIds?.length || 0), 0)} / {cameras.length}
                </span>
              </div>
              <CameraIcon className="w-6 h-6 text-emerald-400/60" />
            </div>
          </div>

          {/* Companies Cards Grid */}
          {filteredCompanies.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 mx-auto text-slate-600" />
              <h3 className="text-sm font-bold text-slate-300">Nenhuma empresa encontrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchTerm ? 'Nenhum resultado corresponde à busca.' : 'Cadastre a primeira empresa para iniciar a distribuição White Label.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleOpenNewCompany}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition"
                >
                  Cadastrar Primeira Empresa
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCompanies.map((comp) => {
                const companyUsers = users.filter((u) => u.companyId === comp.id);
                const isSelectedForPreview = activeCompanyId === comp.id;

                return (
                  <div
                    key={comp.id}
                    className={`bg-slate-900/90 border rounded-2xl p-5 space-y-4 transition flex flex-col justify-between ${
                      isSelectedForPreview
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Branding Header */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              comp.status === 'ACTIVE'
                                ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                            {comp.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditCompany(comp)}
                            title="Editar empresa"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja realmente remover a empresa "${comp.name}"?`)) {
                                onDeleteCompany(comp.id);
                              }
                            }}
                            title="Excluir empresa"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Logo & Name */}
                      <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        {comp.logoUrl ? (
                          <img
                            src={comp.logoUrl}
                            alt={comp.name}
                            className="h-9 max-w-[120px] object-contain rounded-md bg-white/5 p-1"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-sm">
                            {comp.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-sm text-slate-100 truncate">{comp.name}</h3>
                          <span className="text-[11px] text-slate-400 block truncate">{comp.email}</span>
                        </div>
                      </div>

                      {/* Quota Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1">
                            <CameraIcon className="w-3.5 h-3.5 text-slate-500" /> Câmeras Alocadas
                          </span>
                          <span className="font-bold text-slate-200">
                            {comp.assignedCameraIds?.length || 0} / {comp.maxCameras}
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (comp.assignedCameraIds?.length || 0) >= comp.maxCameras
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{
                              width: `${Math.min(100, ((comp.assignedCameraIds?.length || 0) / Math.max(1, comp.maxCameras)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Info Pills */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-slate-300">
                          <span className="text-slate-500 block text-[10px]">Clientes Cadastrados</span>
                          <span className="font-bold flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" /> {companyUsers.length} cliente(s)
                          </span>
                        </div>
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-slate-300">
                          <span className="text-slate-500 block text-[10px]">Cores Customizadas</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: comp.colors?.dark?.primary || comp.colors?.light?.primary || '#D93B58' }}
                            />
                            <span
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: comp.colors?.dark?.background || '#141E26' }}
                            />
                            <span
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: comp.colors?.light?.background || '#F8FAFC' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Criada em: {comp.createdAt}</span>
                      {onSelectCompanyPreview && (
                        <button
                          onClick={() => onSelectCompanyPreview(isSelectedForPreview ? null : comp)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                            isSelectedForPreview
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {isSelectedForPreview ? 'Visualizando Tema' : 'Testar Tema'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Default Branding Configuration Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Palette className="w-5 h-5 text-rose-400" /> Identidade Visual Padrão da Plataforma (ITL)
              </h2>
              <p className="text-xs text-slate-400">
                Define o nome, logotipo e paleta de cores padrão exibidos para clientes sem empresa vinculada
              </p>
            </div>
            <button
              onClick={handleSaveDefaultBranding}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-500/20"
            >
              Salvar Identidade Padrão
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Sistema / Plataforma:</label>
                <input
                  type="text"
                  value={defaultName}
                  onChange={(e) => setDefaultName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-xs outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL do Logotipo (PNG / SVG):</label>
                <input
                  type="text"
                  value={defaultLogoUrl}
                  onChange={(e) => setDefaultLogoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-xs outline-none focus:border-rose-500"
                />
                <div className="mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-center">
                  <img src={defaultLogoUrl} alt="Logo Preview" className="h-10 object-contain" />
                </div>
              </div>
            </div>

            {/* Color Palette Editors */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Modo de Pré-visualização:</span>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setThemeModePreview('dark')}
                    className={`px-2.5 py-1 rounded transition ${themeModePreview === 'dark' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                  >
                    Dark Mode
                  </button>
                  <button
                    onClick={() => setThemeModePreview('light')}
                    className={`px-2.5 py-1 rounded transition ${themeModePreview === 'light' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                  >
                    Light Mode
                  </button>
                </div>
              </div>

              {themeModePreview === 'dark' ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">Cores Dark Mode:</span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Cor Primária (Accent):</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultDarkColors.primary}
                          onChange={(e) => setDefaultDarkColors({ ...defaultDarkColors, primary: e.target.value })}
                          className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-mono">{defaultDarkColors.primary}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Background:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultDarkColors.background}
                          onChange={(e) => setDefaultDarkColors({ ...defaultDarkColors, background: e.target.value })}
                          className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-mono">{defaultDarkColors.background}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Card / Painéis:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultDarkColors.card}
                          onChange={(e) => setDefaultDarkColors({ ...defaultDarkColors, card: e.target.value })}
                          className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-mono">{defaultDarkColors.card}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Bordas:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultDarkColors.border}
                          onChange={(e) => setDefaultDarkColors({ ...defaultDarkColors, border: e.target.value })}
                          className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-mono">{defaultDarkColors.border}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">Cores Light Mode:</span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Cor Primária (Accent):</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultLightColors.primary}
                          onChange={(e) => setDefaultLightColors({ ...defaultLightColors, primary: e.target.value })}
                          className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-mono">{defaultLightColors.primary}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Background:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultLightColors.background}
                          onChange={(e) => setDefaultLightColors({ ...defaultLightColors, background: e.target.value })}
                          className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-mono">{defaultLightColors.background}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Card / Painéis:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultLightColors.card}
                          onChange={(e) => setDefaultLightColors({ ...defaultLightColors, card: e.target.value })}
                          className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-mono">{defaultLightColors.card}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Bordas:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultLightColors.border}
                          onChange={(e) => setDefaultLightColors({ ...defaultLightColors, border: e.target.value })}
                          className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-mono">{defaultLightColors.border}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for Creating / Editing Company */}
      {isModalOpen && editingCompany && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {editingCompany.id.startsWith('empresa-') && !companies.some((c) => c.id === editingCompany.id)
                      ? 'Cadastrar Nova Empresa Parceira'
                      : `Editar Empresa: ${editingCompany.name}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure as credenciais, cota de câmeras, logotipo e paleta de cores da empresa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-5 text-xs">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome da Empresa:*</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    placeholder="Ex: Alfa Segurança & Monitoramento"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CNPJ / Documento:</label>
                  <input
                    type="text"
                    value={editingCompany.cnpj || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email de Contato / Admin:*</label>
                  <input
                    type="email"
                    required
                    value={editingCompany.email}
                    onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                    placeholder="admin@empresa.com.br"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp:</label>
                  <input
                    type="text"
                    value={editingCompany.phone || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                    placeholder="+55 73 99999-9999"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cota Máxima de Câmeras:</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={editingCompany.maxCameras}
                    onChange={(e) => setEditingCompany({ ...editingCompany, maxCameras: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status da Empresa:</label>
                  <select
                    value={editingCompany.status}
                    onChange={(e) => setEditingCompany({ ...editingCompany, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                  >
                    <option value="ACTIVE">Ativa (Acesso Liberado)</option>
                    <option value="INACTIVE">Inativa</option>
                    <option value="SUSPENDED">Suspensa</option>
                  </select>
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">URL do Logotipo da Empresa (PNG / SVG / WebP):</label>
                <input
                  type="text"
                  value={editingCompany.logoUrl}
                  onChange={(e) => setEditingCompany({ ...editingCompany, logoUrl: e.target.value })}
                  placeholder="https://sua-empresa.com.br/logo.png"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl outline-none focus:border-rose-500"
                />
                {editingCompany.logoUrl && (
                  <div className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded-xl inline-block">
                    <img src={editingCompany.logoUrl} alt="Logo" className="h-8 max-w-[160px] object-contain" />
                  </div>
                )}
              </div>

              {/* Camera Allocation Section */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">
                      Alocação de Câmeras para esta Empresa ({editingCompany.assignedCameraIds?.length || 0} de {editingCompany.maxCameras} selecionadas)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Selecione quais câmeras da infraestrutura estarão no pool desta empresa
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = cameras.slice(0, editingCompany.maxCameras).map((c) => c.id);
                      setEditingCompany({ ...editingCompany, assignedCameraIds: allIds });
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Preencher Cota
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {cameras.map((cam) => {
                    const isChecked = editingCompany.assignedCameraIds?.includes(cam.id);
                    return (
                      <label
                        key={cam.id}
                        onClick={() => handleToggleCameraAssignment(cam.id)}
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
                        <span className="text-[10px] text-slate-500 ml-auto uppercase font-mono">{cam.protocol}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Color Customization Section */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 block text-xs">
                  Cores e Paleta Visual da Empresa
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dark mode colors */}
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">Dark Mode</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Cor Primária:</label>
                        <input
                          type="color"
                          value={editingCompany.colors?.dark?.primary || '#D93B58'}
                          onChange={(e) =>
                            setEditingCompany({
                              ...editingCompany,
                              colors: {
                                ...editingCompany.colors,
                                dark: { ...editingCompany.colors.dark, primary: e.target.value },
                              },
                            })
                          }
                          className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Fundo (Dark):</label>
                        <input
                          type="color"
                          value={editingCompany.colors?.dark?.background || '#141E26'}
                          onChange={(e) =>
                            setEditingCompany({
                              ...editingCompany,
                              colors: {
                                ...editingCompany.colors,
                                dark: { ...editingCompany.colors.dark, background: e.target.value },
                              },
                            })
                          }
                          className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Light mode colors */}
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">Light Mode</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Cor Primária:</label>
                        <input
                          type="color"
                          value={editingCompany.colors?.light?.primary || '#D93B58'}
                          onChange={(e) =>
                            setEditingCompany({
                              ...editingCompany,
                              colors: {
                                ...editingCompany.colors,
                                light: { ...editingCompany.colors.light, primary: e.target.value },
                              },
                            })
                          }
                          className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Fundo (Light):</label>
                        <input
                          type="color"
                          value={editingCompany.colors?.light?.background || '#F8FAFC'}
                          onChange={(e) =>
                            setEditingCompany({
                              ...editingCompany,
                              colors: {
                                ...editingCompany.colors,
                                light: { ...editingCompany.colors.light, background: e.target.value },
                              },
                            })
                          }
                          className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition shadow-lg shadow-rose-500/20"
                >
                  Salvar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
