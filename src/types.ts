export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'RECORDING' | 'ALERT';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'GUARD' | 'RESIDENT' | 'VIEWER';

export interface CustomPermissions {
  canViewLive: boolean;
  canViewRecordings: boolean;
  canControlPTZ: boolean;
  canUseTwoWayAudio: boolean;
  canManageCameras: boolean;
  canDeleteRecordings: boolean;
  canAccessAuditLogs: boolean;
  canManageUsers: boolean;
  canExportReports: boolean;
  canManageFinancial?: boolean;
}

export type FinancialStatus = 'OK' | 'WARNING' | 'BLOCKED';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  passwordHash?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  stateUf?: string;
  city?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  customPermissions: CustomPermissions;
  allowedCameraIds?: string[];
  lastActive: string;
  createdAt: string;

  // Financial fields
  planId?: string;
  planName?: string;
  monthlyFee?: number;
  chosenDueDay?: 5 | 10 | 15 | 20;
  financialStatus?: FinancialStatus;
  daysOverdue?: number;
}

export interface FinancialPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  camerasIncluded: number;
  cloudRetentionDays: number;
  description: string;
  popular?: boolean;
}

export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';

export interface Invoice {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  originalAmount: number;
  dueDate: string;
  paymentDate?: string;
  status: InvoiceStatus;
  isProRata: boolean;
  proRataDays?: number;
  pixCode?: string;
  pixQrCodeUrl?: string;
  mercadoPagoPaymentId?: string;
  createdAt: string;
}

export interface MercadoPagoConfig {
  accessToken: string;
  publicKey: string;
  webhookSecret: string;
  isSandbox: boolean;
  autoApproveSimulated: boolean;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  protocol?: 'RTSP' | 'RTMP';
  connectionType?: 'LOCAL' | 'REMOTE';
  rtspUrl: string;
  rtmpUrl?: string;
  streamKey?: string;
  rtmpServerUrl?: string;
  fullRtmpUrl?: string;
  stateUf?: string;
  city?: string;
  status: CameraStatus;
  isE2EEEncrypted: boolean;
  encryptionKeyHash?: string;
  fps: number;
  resolution: string;
  storageUsedGB: number;
  cloudRecordingsActive: boolean;
  motionSensitivity: number;
  aiDetectionEnabled: boolean;
  twoWayAudioEnabled: boolean;
  lat: number;
  lng: number;
  createdAt?: string;
  thumbnailUrl?: string;
  videoStreamUrl?: string;
  isLiveWebcam?: boolean;
  isDemo?: boolean;
}

export interface CloudRecording {
  id: string;
  cameraId: string;
  cameraName: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  fileSizeMB: number;
  thumbnailUrl: string;
  streamUrl: string;
  isE2EELocked: boolean;
  tags: string[];
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userName: string;
  action: string;
  category: 'AUTH' | 'LIVE_VIEW' | 'RECORDING' | 'SYSTEM' | 'BACKUP' | 'PTZ' | 'AUDIO' | 'FINANCIAL' | 'SETTINGS';
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface BackupConfig {
  schedule: 'DAILY_0200' | 'WEEKLY_SUNDAY_0200' | 'MONTHLY_1ST';
  destination: 'LOCAL_VPS' | 'AWS_S3' | 'WASABI' | 'GOOGLE_DRIVE';
  retentionDays: number;
  encryptBackups: boolean;
  autoBackupEnabled: boolean;
  lastBackupDate: string;
  nextBackupDate: string;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  storagePath?: string;
  storageLimitGB?: number;
}

export interface NotificationConfig {
  pushEnabled: boolean;
  fcmServerKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  whatsappWebhookUrl: string;
  soundAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  alertSeverities: AlertSeverity[];
}

export interface E2EESettings {
  isVaultUnlocked: boolean;
  passphraseHash: string;
  algorithm: string;
  totalEncryptedStreams: number;
}

export interface ArchitectureConfig {
  primaryTopology: 'CENTRAL_GPU' | 'HYBRID_RESILIENT' | 'DISTRIBUTED_EDGE';
  centralMediaMtxUrl: string;
  ffmpegPreset: 'ultrafast' | 'medium' | 'gpu_nvenc';
  gstreamerEnabled: boolean;
  onvifAutoDiscovery: boolean;
  redisQueueUrl: string;
  postgresVectorUrl: string;
  minioStorageUrl: string;
  edgeNodesCount: number;
  edgeSyncIntervalSec: number;
  offlineCacheEnabled: boolean;
}

export interface StreamInfo {
  cameraId: string;
  cameraName: string;
  rtspUrl: string;
  hlsUrl: string;
  webrtcUrl: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  bitrateKbps: number;
  codecs: string;
  ingestGateway: 'MediaMTX-Fiber' | 'FFmpeg-NVENC' | 'GStreamer-DeepStream' | 'ONVIF-Direct';
}
