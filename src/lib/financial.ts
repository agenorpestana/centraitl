import { FinancialPlan, MercadoPagoConfig } from '../types';

export const INITIAL_PLANS: FinancialPlan[] = [
  {
    id: 'plan-vizinhanca-01',
    name: 'Plano Vizinhança Protegida ITL',
    monthlyPrice: 149.90,
    camerasIncluded: 4,
    cloudRetentionDays: 7,
    description: 'Ideal para ruas residenciais e condomínios até 4 câmeras HD com retenção de 7 dias.',
    popular: true,
    createdAt: '2026-07-01',
  },
  {
    id: 'plan-comercial-02',
    name: 'Plano Comercio Seguro Pro',
    monthlyPrice: 299.90,
    camerasIncluded: 8,
    cloudRetentionDays: 15,
    description: 'Para estabelecimentos comerciais com suporte a 8 câmeras e IA de Detecção Humana.',
    popular: false,
    createdAt: '2026-07-01',
  },
  {
    id: 'plan-enterprise-03',
    name: 'Plano Enterprise Cidade Segura',
    monthlyPrice: 599.90,
    camerasIncluded: 16,
    cloudRetentionDays: 30,
    description: 'Máxima segurança e retenção de 30 dias na nuvem com criptografia E2EE.',
    popular: false,
    createdAt: '2026-07-01',
  },
];

export const INITIAL_MP_CONFIG: MercadoPagoConfig = {
  id: 'default',
  accessToken: '',
  publicKey: '',
  webhookSecret: '',
  isSandbox: true,
  autoApproveSimulated: true,
  updatedAt: '2026-07-28 00:00:00',
};
