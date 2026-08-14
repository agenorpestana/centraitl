import { WhiteLabelConfig, Company, WhiteLabelThemeColors } from '../types';

/**
 * Standard Default White Label Configuration as specified by user:
 * 
 * itl: {
 *   id: 'itl-default',
 *   name: 'CENTRAL ITL',
 *   logoUrl: 'https://via.placeholder.com/300x100?text=CENTRAL+ITL',
 *   colors: {
 *     light: {
 *       background: '#F8FAFC',
 *       card: '#FFFFFF',
 *       text: '#141E26',
 *       textSecondary: '#64748B',
 *       inputLabel: '#475569',
 *       buttonOutlineText: '#141E26',
 *       primary: '#D93B58',
 *       border: '#CBD5E1',
 *       success: '#00E59B',
 *       error: '#FF3333'
 *     },
 *     dark: {
 *       background: '#141E26',
 *       card: '#1F2C38',
 *       text: '#F2F2F2',
 *       textSecondary: '#A4B4C4',
 *       inputLabel: '#94A3B8',
 *       buttonOutlineText: '#F2F2F2',
 *       primary: '#D93B58',
 *       border: '#2A3B4C',
 *       success: '#00E59B',
 *       error: '#FF3333'
 *     }
 *   }
 * }
 */

export const DEFAULT_ITL_WHITELABEL: WhiteLabelConfig = {
  id: 'itl-default',
  name: 'CENTRAL ITL',
  logoUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=300&h=100&auto=format&fit=crop&q=80',
  colors: {
    light: {
      background: '#F8FAFC',
      card: '#FFFFFF',
      text: '#141E26',
      textSecondary: '#64748B',
      inputLabel: '#475569',
      buttonOutlineText: '#141E26',
      primary: '#D93B58',
      border: '#CBD5E1',
      success: '#00E59B',
      error: '#FF3333',
    },
    dark: {
      background: '#141E26',
      card: '#1F2C38',
      text: '#F2F2F2',
      textSecondary: '#A4B4C4',
      inputLabel: '#94A3B8',
      buttonOutlineText: '#F2F2F2',
      primary: '#D93B58',
      border: '#2A3B4C',
      success: '#00E59B',
      error: '#FF3333',
    },
  },
};

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'empresa-seguranca-sul',
    name: 'Sul Segurança & Monitoramento',
    cnpj: '12.345.678/0001-90',
    email: 'contato@sulsecurance.com.br',
    phone: '+55 73 9988-7766',
    maxCameras: 12,
    assignedCameraIds: ['cam-01', 'cam-02', 'cam-03', 'cam-04'],
    logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=300&h=100&auto=format&fit=crop&q=80',
    colors: {
      light: {
        background: '#F0F9FF',
        card: '#FFFFFF',
        text: '#0C4A6E',
        textSecondary: '#0284C7',
        inputLabel: '#0369A1',
        buttonOutlineText: '#0284C7',
        primary: '#0284C7',
        border: '#BAE6FD',
        success: '#10B981',
        error: '#EF4444',
      },
      dark: {
        background: '#082F49',
        card: '#0C4A6E',
        text: '#F0F9FF',
        textSecondary: '#7DD3FC',
        inputLabel: '#38BDF8',
        buttonOutlineText: '#F0F9FF',
        primary: '#38BDF8',
        border: '#0369A1',
        success: '#34D399',
        error: '#F87171',
      },
    },
    status: 'ACTIVE',
    createdAt: '2026-01-15',
    adminUserId: 'user-company-admin-01',
    customDomain: 'monitoramento.sulsecurance.com.br',
  },
  {
    id: 'empresa-condominio-alpha',
    name: 'Alpha Proteção Patrimonial',
    cnpj: '98.765.432/0001-10',
    email: 'admin@alphaprotecao.com.br',
    phone: '+55 73 9911-2233',
    maxCameras: 8,
    assignedCameraIds: ['cam-05', 'cam-06'],
    logoUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=300&h=100&auto=format&fit=crop&q=80',
    colors: {
      light: {
        background: '#FAF5FF',
        card: '#FFFFFF',
        text: '#581C87',
        textSecondary: '#7E22CE',
        inputLabel: '#6B21A8',
        buttonOutlineText: '#7E22CE',
        primary: '#8B5CF6',
        border: '#E9D5FF',
        success: '#10B981',
        error: '#EF4444',
      },
      dark: {
        background: '#1E1035',
        card: '#2E1065',
        text: '#FAF5FF',
        textSecondary: '#C084FC',
        inputLabel: '#A855F7',
        buttonOutlineText: '#FAF5FF',
        primary: '#A855F7',
        border: '#4C1D95',
        success: '#34D399',
        error: '#F87171',
      },
    },
    status: 'ACTIVE',
    createdAt: '2026-02-01',
    adminUserId: 'user-company-admin-02',
    customDomain: 'camerasaovivo.alphaprotecao.com.br',
  },
];

/**
 * Injects CSS Custom Variables into document root based on active branding and theme mode
 */
export function applyThemeVariables(colors: WhiteLabelThemeColors): void {
  try {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--wl-bg', colors.background);
    root.style.setProperty('--wl-card', colors.card);
    root.style.setProperty('--wl-text', colors.text);
    root.style.setProperty('--wl-text-sec', colors.textSecondary);
    root.style.setProperty('--wl-label', colors.inputLabel);
    root.style.setProperty('--wl-btn-outline', colors.buttonOutlineText);
    root.style.setProperty('--wl-primary', colors.primary);
    root.style.setProperty('--wl-border', colors.border);
    root.style.setProperty('--wl-success', colors.success);
    root.style.setProperty('--wl-error', colors.error);
  } catch (e) {
    console.error('[WhiteLabel] Erro ao aplicar variáveis CSS:', e);
  }
}

/**
 * Convenience helper to apply theme directly from a WhiteLabelConfig or Company object
 */
export function applyWhiteLabelTheme(config: { colors?: { light?: WhiteLabelThemeColors; dark?: WhiteLabelThemeColors } } | null | undefined): void {
  if (!config?.colors) return;
  const darkColors = config.colors.dark || config.colors.light;
  if (darkColors) {
    applyThemeVariables(darkColors);
  }
}

/**
 * Resolves active WhiteLabel branding configuration for a given company or default ITL
 */
export function resolveWhiteLabelConfig(company?: Company | null, overrideConfig?: WhiteLabelConfig | null): WhiteLabelConfig {
  if (overrideConfig && overrideConfig.id) {
    return overrideConfig;
  }
  if (company && company.colors) {
    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl || DEFAULT_ITL_WHITELABEL.logoUrl,
      colors: company.colors || DEFAULT_ITL_WHITELABEL.colors,
    };
  }
  return DEFAULT_ITL_WHITELABEL;
}
