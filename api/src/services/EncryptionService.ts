import crypto from 'crypto';

/**
 * Encryption service for sensitive data
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits

  /**
   * Get encryption key from environment or generate one
   */
  private static getEncryptionKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
      // If key is provided in env, derive it using PBKDF2
      const salt = Buffer.from(process.env.ENCRYPTION_SALT || 'mirrorly-default-salt', 'utf8');
      return crypto.pbkdf2Sync(envKey, salt, 100000, this.KEY_LENGTH, 'sha256');
    }
    
    // Fallback: generate a key from a default secret (not recommended for production)
    const defaultSecret = process.env.JWT_SECRET || 'mirrorly-default-secret-key';
    const salt = Buffer.from('mirrorly-license-encryption', 'utf8');
    return crypto.pbkdf2Sync(defaultSecret, salt, 100000, this.KEY_LENGTH, 'sha256');
  }

  /**
   * Encrypt a string value
   * @param plaintext The string to encrypt
   * @returns Encrypted string in format: salt:iv:tag:encrypted
   */
  public static encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty value');
    }

    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      cipher.setAAD(salt); // Use salt as additional authenticated data
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Return format: salt:iv:tag:encrypted
      return [
        salt.toString('hex'),
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted
      ].join(':');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt an encrypted string
   * @param encryptedData The encrypted string in format: salt:iv:tag:encrypted
   * @returns Decrypted plaintext string
   */
  public static decrypt(encryptedData: string): string {
    if (!encryptedData) {
      throw new Error('Cannot decrypt empty value');
    }

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const [saltHex, ivHex, tagHex, encrypted] = parts;
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      
      const key = this.getEncryptionKey();
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAAD(salt);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a string appears to be encrypted (has the expected format)
   * @param value The string to check
   * @returns True if the string appears to be encrypted
   */
  public static isEncrypted(value: string): boolean {
    if (!value) return false;
    
    const parts = value.split(':');
    return parts.length === 4 && 
           parts.every(part => /^[a-f0-9]+$/i.test(part)) &&
           parts[0].length === this.SALT_LENGTH * 2 && // salt hex length
           parts[1].length === this.IV_LENGTH * 2 &&   // iv hex length
           parts[2].length === this.TAG_LENGTH * 2;    // tag hex length
  }

  /**
   * Safely encrypt a value only if it's not already encrypted
   * @param value The value to encrypt
   * @returns Encrypted value or original if already encrypted
   */
  public static safeEncrypt(value: string): string {
    if (this.isEncrypted(value)) {
      return value; // Already encrypted
    }
    return this.encrypt(value);
  }

  /**
   * Safely decrypt a value only if it appears to be encrypted
   * @param value The value to decrypt
   * @returns Decrypted value or original if not encrypted
   */
  public static safeDecrypt(value: string): string {
    if (!this.isEncrypted(value)) {
      return value; // Not encrypted
    }
    return this.decrypt(value);
  }
}

export default EncryptionService;