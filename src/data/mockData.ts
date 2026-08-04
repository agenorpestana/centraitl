import {
  Camera,
  CloudRecording,
  User,
  ActivityLog,
  BackupConfig,
  NotificationConfig,
  E2EESettings,
  ArchitectureConfig,
  StreamInfo,
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-superadmin-01',
    name: 'Super Admin Unity',
    email: 'admin@sistema.com.br',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '+55 11 98765-4321',
    stateUf: 'BA',
    city: 'Itamaraju',
    status: 'ACTIVE',
    customPermissions: {
      canViewLive: true,
      canViewRecordings: true,
      canControlPTZ: true,
      canUseTwoWayAudio: true,
      canManageCameras: true,
      canDeleteRecordings: true,
      canAccessAuditLogs: true,
      canManageUsers: true,
      canExportReports: true,
    },
    allowedCameraIds: ['ALL'],
    lastActive: 'Agora mesmo',
    createdAt: '2026-01-01',
  }
];

export const INITIAL_CAMERAS: Camera[] = [];

export const INITIAL_RECORDINGS: CloudRecording[] = [];

export const INITIAL_ARCHITECTURE_CONFIG: ArchitectureConfig = {
  primaryTopology: 'CENTRAL_GPU',
  centralMediaMtxUrl: 'rtsp://datacenter-isp.internal:8554',
  ffmpegPreset: 'gpu_nvenc',
  gstreamerEnabled: true,
  onvifAutoDiscovery: true,
  redisQueueUrl: 'redis://datacenter-isp.internal:6379/0',
  postgresVectorUrl: 'postgresql://admin:secret@datacenter-isp.internal:5432/vms_pgvector',
  minioStorageUrl: 'https://s3-storage.datacenter-isp.internal',
  edgeNodesCount: 4,
  edgeSyncIntervalSec: 10,
  offlineCacheEnabled: true,
};

export const INITIAL_STREAMS: StreamInfo[] = [];

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log-101',
    userName: 'Super Admin Unity',
    action: 'Sistema Central ITL Inicializado',
    category: 'SYSTEM',
    details: 'Serviço de gerenciamento de transmissões e gravações ativado',
    ipAddress: '127.0.0.1',
    timestamp: '2026-07-29 05:00:00',
  }
];

export const INITIAL_BACKUP_CONFIG: BackupConfig = {
  schedule: 'WEEKLY_SUNDAY_0200',
  destination: 'LOCAL_VPS',
  retentionDays: 30,
  encryptBackups: true,
  autoBackupEnabled: true,
  lastBackupDate: '2026-07-20 02:00:00',
  nextBackupDate: '2026-07-27 02:00:00',
  status: 'IDLE',
  storagePath: '/var/www/itl-backups/',
  storageLimitGB: 100,
};

export const INITIAL_NOTIFICATION_CONFIG: NotificationConfig = {
  pushEnabled: true,
  fcmServerKey: '',
  telegramBotToken: '',
  telegramChatId: '',
  whatsappWebhookUrl: '',
  soundAlerts: true,
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '06:00',
  alertSeverities: ['CRITICAL', 'HIGH', 'MEDIUM'],
};

export const INITIAL_E2EE_SETTINGS: E2EESettings = {
  isVaultUnlocked: true,
  passphraseHash: 'e2ee-master-passphrase-itl-sec-2026',
  algorithm: 'AES-256-GCM',
  totalEncryptedStreams: 0,
};
