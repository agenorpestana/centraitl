import { Company, WhiteLabelConfig } from '../types';

export const DEFAULT_ITL_WHITELABEL: WhiteLabelConfig = {
  name: 'Central ITL de Câmeras & Segurança',
  logoUrl: '/pwa-icon.svg',
  colors: {
    primary: '#10b981',
    secondary: '#0f172a',
    accent: '#06b6d4',
  },
  footerText: '© 2026 Central ITL Seg - Todos os direitos reservados.',
  supportEmail: 'suporte@unityautomacoes.com.br',
  supportPhone: '+55 73 99999-0000',
};

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-matriz-01',
    name: 'Unity Automações & Segurança',
    cnpj: '00.000.000/0001-00',
    email: 'suporte@unityautomacoes.com.br',
    phone: '(73) 99999-0000',
    maxCameras: 50,
    assignedCameraIds: ['ALL'],
    logoUrl: '/pwa-icon.svg',
    colors: {
      primary: '#10b981',
      secondary: '#0f172a',
      accent: '#06b6d4',
    },
    status: 'ACTIVE',
    createdAt: '2026-01-01',
  },
];
