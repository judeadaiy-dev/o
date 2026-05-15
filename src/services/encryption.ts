import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'SeaChat2026SecretKeyV2SecureMessageEncryption';

class EncryptionService {
  encrypt(text: string): string {
    try {
      return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      return text;
    }
  }

  decrypt(ciphertext: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || '[رسالة مشفرة]';
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[رسالة مشفرة]';
    }
  }

  isEncrypted(text: string): boolean {
    return text.startsWith('U2FsdGVkX1');
  }
}

export const encryptionService = new EncryptionService();
