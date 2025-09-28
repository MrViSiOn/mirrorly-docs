import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';
import { EncryptionService } from '../services/EncryptionService';

// License attributes interface
export interface LicenseAttributes {
  id: number;
  license_key: string;
  domain: string;
  type: 'free' | 'pro_basic' | 'pro_premium';
  status: 'active' | 'expired' | 'suspended';
  monthly_limit: number;
  current_usage: number;
  last_reset: Date;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
  google_key?: string;
}

// Optional attributes for creation
export interface LicenseCreationAttributes extends Optional<LicenseAttributes, 'id' | 'created_at' | 'updated_at' | 'expires_at' | 'google_key'> { }

// License model class
export class License extends Model<LicenseAttributes, LicenseCreationAttributes> implements LicenseAttributes {
  public id!: number;
  public license_key!: string;
  public domain!: string;
  public type!: 'free' | 'pro_basic' | 'pro_premium';
  public status!: 'active' | 'expired' | 'suspended';
  public monthly_limit!: number;
  public current_usage!: number;
  public last_reset!: Date;
  public created_at!: Date;
  public updated_at!: Date;
  public expires_at?: Date;
  public google_key?: string;

  // Instance methods
  public isExpired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
  }

  public canGenerate(): boolean {
    return this.status === 'active' && !this.isExpired() && this.current_usage < this.monthly_limit;
  }

  public getRemainingGenerations(): number {
    return Math.max(0, this.monthly_limit - this.current_usage);
  }

  public shouldResetUsage(): boolean {
    const now = new Date();
    const lastReset = new Date(this.last_reset);
    return now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
  }

  public async resetMonthlyUsage(): Promise<void> {
    this.current_usage = 0;
    this.last_reset = new Date();
    await this.save();
  }

  public async incrementUsage(): Promise<void> {
    this.current_usage += 1;
    await this.save();
  }

  /**
   * Get the decrypted Google API Key
   * @returns Decrypted Google API Key or null if not set
   */
  public getDecryptedGoogleKey(): string | null {
    if (!this.google_key) {
      return null;
    }
    try {
      return EncryptionService.safeDecrypt(this.google_key);
    } catch (error) {
      console.error('Failed to decrypt Google API key:', error);
      return null;
    }
  }

  /**
   * Set the Google API Key (will be encrypted automatically)
   * @param googleApiKey The Google API Key to set (will be encrypted)
   */
  public setGoogleKey(googleApiKey: string): void {
    try {
      this.google_key = EncryptionService.safeEncrypt(googleApiKey);
    } catch (error) {
      console.error('Failed to encrypt Google API key:', error);
      this.google_key = googleApiKey; // Store as-is if encryption fails
    }
  }

  /**
   * Update the Google API Key
   * @param googleApiKey The Google API Key to store
   */
  public async updateGoogleApiKey(googleApiKey: string): Promise<void> {
    this.setGoogleKey(googleApiKey);
    await this.save();
  }

  /**
   * Get the license key (API GUID) - this is not encrypted
   * @returns The license key GUID
   */
  public getLicenseKey(): string {
    return this.license_key;
  }

  /**
   * Check if Google API Key is configured
   * @returns True if Google API Key is set
   */
  public hasGoogleKey(): boolean {
    return !!this.google_key;
  }

  // Static methods
  public static async findByLicenseKey(licenseKey: string): Promise<License | null> {
    return await License.findOne({
      where: { license_key: licenseKey }
    });
  }

  public static async findByDomain(domain: string): Promise<License | null> {
    return await License.findOne({
      where: { domain: domain }
    });
  }

  public static async createFreeLicense(domain: string): Promise<License> {
    const licenseKey = License.generateLicenseKey();

    return await License.create({
      license_key: licenseKey,
      domain: domain,
      type: 'free',
      status: 'active',
      monthly_limit: 10, // FREE limit
      current_usage: 0,
      last_reset: new Date(),
    });
  }

  /**
   * Generate a unique license key in GUID format (XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX)
   * @returns Generated license key GUID
   */
  public static generateLicenseKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const generateSegment = (length: number): string => {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    // Generate GUID format: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
    return `${generateSegment(8)}-${generateSegment(8)}-${generateSegment(8)}-${generateSegment(8)}`;
  }
}

// Initialize the model
License.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    license_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [8, 255],
      },
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i, // Basic domain validation
      },
    },
    type: {
      type: DataTypes.ENUM('free', 'pro_basic', 'pro_premium'),
      allowNull: false,
      defaultValue: 'free',
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
    },
    monthly_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 0,
      },
    },
    current_usage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    last_reset: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    google_key: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Encrypted Google API Key for AI services',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'License',
    tableName: 'licenses',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['license_key'],
      },
      {
        fields: ['domain'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['expires_at'],
      },
    ],
    hooks: {
      beforeValidate: (license: License) => {
        // Normalize domain
        if (license.domain) {
          license.domain = license.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
        }
      },
      beforeCreate: (license: License) => {
        // Encrypt google_key before storing if provided
        if (license.google_key) {
          license.google_key = EncryptionService.safeEncrypt(license.google_key);
        }
      },
      beforeUpdate: (license: License) => {
        // Check if license has expired and update status
        if (license.expires_at && new Date() > license.expires_at) {
          license.status = 'expired';
        }
        
        // Encrypt google_key if it's being updated
        if (license.changed('google_key') && license.google_key) {
          license.google_key = EncryptionService.safeEncrypt(license.google_key);
        }
      },
    },
  }
);

export default License;