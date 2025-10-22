// Crypto utility for token encryption/decryption
import { APP_CONFIG, CRYPTO_CONFIG } from '../config';

class TokenCrypto {
  constructor() {
    this.sessionKey = APP_CONFIG.storageKeys.cryptoKey;
    this.algorithm = CRYPTO_CONFIG.algorithm;
    this.keyLength = CRYPTO_CONFIG.keyLength;
    this.ivLength = CRYPTO_CONFIG.ivLength;
  }

  // Get or generate encryption key
  async getKey() {
    // Try to get existing key from localStorage
    const keyData = localStorage.getItem(this.sessionKey);

    if (keyData) {
      try {
        const cryptoKey = await crypto.subtle.importKey(
          'jwk',
          JSON.parse(keyData),
          { name: this.algorithm },
          false,
          ['encrypt', 'decrypt']
        );
        return cryptoKey;
      } catch (error) {
        console.warn('Failed to import existing key, generating new one:', error);
      }
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Export and store key in localStorage
    const exportedKey = await crypto.subtle.exportKey('jwk', key);

    localStorage.setItem(this.sessionKey, JSON.stringify(exportedKey));

    return key;
  }
  // Encrypt token
  async encryptToken(token) {
    try {
      if (!token) return null;

      const key = await this.getKey();
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        key,
        new TextEncoder().encode(token)
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  // Decrypt token
  async decryptToken(encryptedToken) {
    try {
      if (!encryptedToken) return null;

      const key = await this.getKey();

      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        key,
        encryptedData
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  // Clear stored key
  clearKey() {
    localStorage.removeItem(this.sessionKey);
  }
}

// Create singleton instance
const tokenCrypto = new TokenCrypto();

export default tokenCrypto;
