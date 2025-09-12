import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

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
}

// Optional attributes for creation
export interface LicenseCreationAttributes extends Optional<LicenseAttributes, 'id' | 'created_at' | 'updated_at'> { }

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

  public static generateLicenseKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i > 0 && (i + 1) % 8 === 0 && i < 31) {
        result += '-';
      }
    }
    return result;
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
      beforeUpdate: (license: License) => {
        // Auto-expire check
        if (license.expires_at && new Date() > license.expires_at && license.status === 'active') {
          license.status = 'expired';
        }
      },
    },
  }
);

export default License;