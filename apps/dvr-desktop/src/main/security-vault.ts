import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { safeStorage } from 'electron';

export interface AgentCredentials {
  serverUrl: string;
  agentId: string;
  deviceId: string;
  deviceToken: string;
  companyId?: string;
  retentionDays: number;
  storageLimitGB: number;
  recordingsDirectory: string;
}

export class SecurityVault {
  private configPath: string;
  private memoryKey: Buffer;

  constructor(userDataDir: string) {
    this.configPath = path.join(userDataDir, 'dvr_agent_vault.enc');
    // Fallback key derived from machine-specific hardware properties
    const machineSeed = `${process.env.COMPUTERNAME || 'WINDOWS'}_${process.env.USERNAME || 'USER'}_ITL_DVR_2026`;
    this.memoryKey = crypto.createHash('sha256').update(machineSeed).digest();
  }

  public saveCredentials(creds: AgentCredentials): void {
    const rawJson = JSON.stringify(creds);
    let cipherBuffer: Buffer;

    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      // Use native Windows DPAPI Credential Store via Electron safeStorage
      cipherBuffer = safeStorage.encryptString(rawJson);
    } else {
      // Hardware-keyed AES-256-GCM encryption
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.memoryKey, iv);
      const enc = Buffer.concat([cipher.update(rawJson, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      cipherBuffer = Buffer.concat([Buffer.from('AESGCM:'), iv, tag, enc]);
    }

    fs.writeFileSync(this.configPath, cipherBuffer);
  }

  public loadCredentials(): AgentCredentials | null {
    if (!fs.existsSync(this.configPath)) return null;

    try {
      const data = fs.readFileSync(this.configPath);
      let plainText = '';

      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        try {
          plainText = safeStorage.decryptString(data);
        } catch (e) {
          plainText = this.decryptWithAesGcm(data);
        }
      } else {
        plainText = this.decryptWithAesGcm(data);
      }

      if (!plainText) return null;
      return JSON.parse(plainText) as AgentCredentials;
    } catch (err) {
      console.error('[SecurityVault] Erro ao carregar credenciais criptografadas:', err);
      return null;
    }
  }

  public clear(): void {
    if (fs.existsSync(this.configPath)) {
      try {
        fs.unlinkSync(this.configPath);
      } catch (e) {}
    }
  }

  private decryptWithAesGcm(data: Buffer): string {
    const prefix = 'AESGCM:';
    if (!data.toString('utf8', 0, prefix.length).startsWith(prefix)) {
      return '';
    }
    const iv = data.subarray(prefix.length, prefix.length + 12);
    const tag = data.subarray(prefix.length + 12, prefix.length + 28);
    const encrypted = data.subarray(prefix.length + 28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.memoryKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
