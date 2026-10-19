import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { safeStorage } from 'electron';

export interface UserSession {
  serverUrl: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId?: string;
  };
  expiresAt?: number;
}

export class SecurityVault {
  private configPath: string;
  private memoryKey: Buffer;

  constructor(userDataDir: string) {
    this.configPath = path.join(userDataDir, 'dvr_session_vault.enc');
    const machineSeed = `${process.env.COMPUTERNAME || 'WINDOWS'}_${process.env.USERNAME || 'USER'}_ITL_DVR_2026`;
    this.memoryKey = crypto.createHash('sha256').update(machineSeed).digest();
  }

  public saveSession(session: UserSession): void {
    const rawJson = JSON.stringify(session);
    let cipherBuffer: Buffer;

    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      cipherBuffer = safeStorage.encryptString(rawJson);
    } else {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.memoryKey, iv);
      const enc = Buffer.concat([cipher.update(rawJson, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      cipherBuffer = Buffer.concat([Buffer.from('AESGCM:'), iv, tag, enc]);
    }

    fs.writeFileSync(this.configPath, cipherBuffer);
  }

  public loadSession(): UserSession | null {
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
      return JSON.parse(plainText) as UserSession;
    } catch (err) {
      console.error('[SecurityVault] Erro ao carregar sessão criptografada:', err);
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
    try {
      const prefix = data.subarray(0, 7).toString();
      if (prefix !== 'AESGCM:') return '';

      const iv = data.subarray(7, 19);
      const tag = data.subarray(19, 35);
      const enc = data.subarray(35);

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.memoryKey, iv);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
      return dec.toString('utf8');
    } catch {
      return '';
    }
  }
}
