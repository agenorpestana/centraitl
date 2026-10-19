// Central ITL - Security Vault
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeStorage } = require('electron');

class SecurityVault {
  constructor(userDataDir) {
    this.configPath = path.join(userDataDir, 'dvr_session_vault.enc');
    const machineSeed = `${process.env.COMPUTERNAME || 'WINDOWS'}_${process.env.USERNAME || 'USER'}_ITL_DVR_2026`;
    this.memoryKey = crypto.createHash('sha256').update(machineSeed).digest();
  }

  saveSession(session) {
    try {
      const rawJson = JSON.stringify(session);
      let cipherBuffer;

      if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
        cipherBuffer = safeStorage.encryptString(rawJson);
      } else {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.memoryKey, iv);
        const enc = Buffer.concat([cipher.update(rawJson, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        cipherBuffer = Buffer.concat([Buffer.from('AESGCM:'), iv, tag, enc]);
      }

      fs.writeFileSync(this.configPath, cipherBuffer);
    } catch (e) {
      console.error('[SecurityVault] Falha ao salvar sessao:', e);
    }
  }

  loadSession() {
    if (!fs.existsSync(this.configPath)) return null;

    try {
      const data = fs.readFileSync(this.configPath);
      let plainText = '';

      if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
        try {
          plainText = safeStorage.decryptString(data);
        } catch (e) {
          plainText = this.decryptWithAesGcm(data);
        }
      } else {
        plainText = this.decryptWithAesGcm(data);
      }

      if (!plainText) return null;
      return JSON.parse(plainText);
    } catch (err) {
      console.error('[SecurityVault] Erro ao carregar sessao criptografada:', err);
      return null;
    }
  }

  clear() {
    if (fs.existsSync(this.configPath)) {
      try {
        fs.unlinkSync(this.configPath);
      } catch (e) {}
    }
  }

  decryptWithAesGcm(data) {
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

module.exports = { SecurityVault };
