import { logError } from '@/lib/logger';
// Simple encryption for client-side token storage
// In production, use a proper encryption library like crypto-js

const CRYPTO_KEY = process.env['NEXT_PUBLIC_CRYPTO_KEY'] || 'finance-app-secret-key-2024';

export const tokenCrypto = {
  // Encrypt token for storage
  async encryptToken(token: string): Promise<string> {
    try {
      // Create a simple obfuscation (not secure, use proper encryption in production)
      const timestamp = Date.now().toString();
      const combined = `${timestamp}::${token}::${CRYPTO_KEY}`;
      const encoded = btoa(combined); // Base64 encode
      
      // Reverse the string for additional obfuscation
      return encoded.split('').reverse().join('');
    } catch (error) {
      logError('Token encryption error:', error);
      throw new Error('Failed to encrypt token');
    }
  },
  
  // Decrypt token from storage
  async decryptToken(encryptedToken: string): Promise<string | null> {
    try {
      // Reverse the string back
      const reversed = encryptedToken.split('').reverse().join('');
      
      // Decode from base64
      const decoded = atob(reversed);
      
      // Split the components
      const parts = decoded.split('::');
      if (parts.length !== 3) {
        return null;
      }
      
      const [timestamp, token, key] = parts;
      
      // Verify the key
      if (key !== CRYPTO_KEY) {
        return null;
      }
      
      // Check token age (optional: add expiry check)
      if (!timestamp) {
        return null;
      }
      
      const timestampNum = parseInt(timestamp);
      if (isNaN(timestampNum)) {
        return null;
      }
      
      const tokenAge = Date.now() - timestampNum;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (tokenAge > maxAge) {
        return null;
      }
      
      return token || null;
    } catch (error) {
      logError('Token decryption error:', error);
      return null;
    }
  },
  
  // Clear encryption key (for logout)
  clearKey(): void {
    // In a real implementation, clear any stored keys
    // This is a placeholder for cleanup operations
  }
};

// Additional encryption utilities
export const crypto = {
  // Generate random string
  generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Hash string (for non-password data)
  async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for server-side
      // Note: This is a simple hash for server compatibility
      // In production, use Node.js crypto module
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    }
  },
  
  // Create secure token
  createSecureToken(): string {
    return `${this.generateRandomString(16)}-${Date.now()}-${this.generateRandomString(16)}`;
  }
};
