import { APP_CONFIG, CRYPTO_CONFIG } from '../config';
// TODO: Reevaluate crypto helper once secure storage strategy is finalized.

type CryptoAlgorithm = typeof CRYPTO_CONFIG.algorithm;

type CryptoKeyUsage = 'encrypt' | 'decrypt';

const isBrowserCryptoAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.crypto !== 'undefined';

const isSecureContext = (): boolean => {
  if (typeof window === 'undefined') {return false;}
  // Check if we're in a secure context (HTTPS or localhost)
  return window.isSecureContext === true;
};

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

class TokenCrypto {
  private readonly sessionKey: string;

  private readonly algorithm: CryptoAlgorithm;

  private readonly keyLength: number;

  private readonly ivLength: number;

  private readonly useSecureCrypto: boolean;

  constructor() {
    this.sessionKey = APP_CONFIG.storageKeys.cryptoKey;
    this.algorithm = CRYPTO_CONFIG.algorithm;
    this.keyLength = CRYPTO_CONFIG.keyLength;
    this.ivLength = CRYPTO_CONFIG.ivLength;
    this.useSecureCrypto = isSecureContext();

    // Warn developers if running in non-secure context
    if (!this.useSecureCrypto && typeof window !== 'undefined') {
      console.warn(
        'Running in non-secure context. Token encryption is disabled. ' +
        'Use HTTPS or localhost for production-grade security.'
      );
    }
  }

  private ensureCrypto(): Crypto {
    if (!isBrowserCryptoAvailable()) {
      throw new Error('Web Crypto API is not available in this environment.');
    }
    return window.crypto;
  }

  // Resolve SubtleCrypto instance across browsers (including Safari's webkitSubtle)
  private getSubtle(cryptoInstance: Crypto): SubtleCrypto {
    const subtle = (cryptoInstance as any).subtle ?? (cryptoInstance as any).webkitSubtle;
    if (!subtle) {
      throw new Error(
        'SubtleCrypto is not available. Ensure the app runs in a secure context (HTTPS or localhost) and a supported browser.'
      );
    }
    return subtle as SubtleCrypto;
  }

  async getKey(): Promise<CryptoKey> {
    const cryptoInstance = this.ensureCrypto();
    const subtle = this.getSubtle(cryptoInstance);
    const keyData = localStorage.getItem(this.sessionKey);

    if (keyData) {
      try {
        const jwk = JSON.parse(keyData) as JsonWebKey;
        const importedKey = await subtle.importKey(
          'jwk',
          jwk,
          { name: this.algorithm },
          false,
          ['encrypt', 'decrypt'] satisfies CryptoKeyUsage[]
        );
        return importedKey;
      } catch (error) {
        console.warn('Failed to import existing key, generating new one:', error);
      }
    }

    const key = await subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true,
      ['encrypt', 'decrypt'] satisfies CryptoKeyUsage[]
    ) as CryptoKey;

    const exportedKey = await subtle.exportKey('jwk', key);
    localStorage.setItem(this.sessionKey, JSON.stringify(exportedKey));

    return key;
  }

  // Fallback encoding for non-secure contexts (Base64 only - NOT SECURE)
  private fallbackEncode(token: string): string {
    return btoa(encodeURIComponent(token));
  }

  // Fallback decoding for non-secure contexts
  private fallbackDecode(encodedToken: string): string {
    return decodeURIComponent(atob(encodedToken));
  }

  async encryptToken(token: string | null | undefined): Promise<string | null> {
    if (!token) {
      return null;
    }

    // Fallback for non-secure contexts (development only)
    if (!this.useSecureCrypto) {
      try {
        return this.fallbackEncode(token);
      } catch (error) {
        console.error('Fallback encoding failed:', error);
        throw new Error('Failed to encode token');
      }
    }

    // Use secure encryption in secure contexts
    try {
      const cryptoInstance = this.ensureCrypto();
      const subtle = this.getSubtle(cryptoInstance);
      const key = await this.getKey();
      const iv = cryptoInstance.getRandomValues(new Uint8Array(this.ivLength));

      const encrypted = await subtle.encrypt(
        {
          name: this.algorithm,
          iv,
        },
        key,
        TEXT_ENCODER.encode(token)
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      let binary = '';
      combined.forEach((value) => {
        binary += String.fromCharCode(value);
      });

      return btoa(binary);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  async decryptToken(
    encryptedToken: string | null | undefined
  ): Promise<string | null> {
    if (!encryptedToken) {
      return null;
    }

    // Fallback for non-secure contexts (development only)
    if (!this.useSecureCrypto) {
      try {
        return this.fallbackDecode(encryptedToken);
      } catch (error) {
        console.error('Fallback decoding failed:', error);
        throw new Error('Failed to decode token');
      }
    }

    // Use secure decryption in secure contexts
    try {
      const cryptoInstance = this.ensureCrypto();
      const subtle = this.getSubtle(cryptoInstance);
      const key = await this.getKey();
      const binary = atob(encryptedToken);
      const combined = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        combined[index] = binary.charCodeAt(index);
      }

      const iv = combined.slice(0, this.ivLength);
      const encryptedData = combined.slice(this.ivLength);

      const decrypted = await subtle.decrypt(
        {
          name: this.algorithm,
          iv,
        },
        key,
        encryptedData
      );

      return TEXT_DECODER.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  clearKey(): void {
    localStorage.removeItem(this.sessionKey);
  }
}

const tokenCrypto = new TokenCrypto();

export default tokenCrypto;
