import { DataTypes, Model, Optional, BelongsToGetAssociationMixin, Op } from 'sequelize';
import sequelize from '../config/database';
import { License } from './License';

// RateLimit attributes interface
export interface RateLimitAttributes {
  id: number;
  license_id: number;
  last_request: Date;
  request_count: number;
  window_start: Date;
  window_duration_ms: number;
  max_requests: number;
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
export interface RateLimitCreationAttributes extends Optional<RateLimitAttributes, 'id' | 'created_at' | 'updated_at'> { }

// RateLimit model class
export class RateLimit extends Model<RateLimitAttributes, RateLimitCreationAttributes> implements RateLimitAttributes {
  public id!: number;
  public license_id!: number;
  public last_request!: Date;
  public request_count!: number;
  public window_start!: Date;
  public window_duration_ms!: number;
  public max_requests!: number;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations
  public getLicense!: BelongsToGetAssociationMixin<License>;

  // Instance methods
  public isWindowExpired(): boolean {
    const now = new Date();
    const windowEnd = new Date(this.window_start.getTime() + this.window_duration_ms);
    return now > windowEnd;
  }

  public canMakeRequest(): boolean {
    if (this.isWindowExpired()) {
      return true; // New window, can make request
    }
    return this.request_count < this.max_requests;
  }

  public getRemainingRequests(): number {
    if (this.isWindowExpired()) {
      return this.max_requests;
    }
    return Math.max(0, this.max_requests - this.request_count);
  }

  public getTimeUntilReset(): number {
    if (this.isWindowExpired()) {
      return 0;
    }
    const windowEnd = new Date(this.window_start.getTime() + this.window_duration_ms);
    return windowEnd.getTime() - new Date().getTime();
  }

  public async recordRequest(): Promise<void> {
    const now = new Date();

    if (this.isWindowExpired()) {
      // Reset window
      this.window_start = now;
      this.request_count = 1;
    } else {
      // Increment counter
      this.request_count += 1;
    }

    this.last_request = now;
    await this.save();
  }

  public async resetWindow(): Promise<void> {
    this.window_start = new Date();
    this.request_count = 0;
    await this.save();
  }

  // Static methods
  public static async findByLicenseId(licenseId: number): Promise<RateLimit | null> {
    return await RateLimit.findOne({
      where: { license_id: licenseId }
    });
  }

  public static async createForLicense(
    licenseId: number,
    maxRequests: number,
    windowDurationMs: number
  ): Promise<RateLimit> {
    return await RateLimit.create({
      license_id: licenseId,
      last_request: new Date(),
      request_count: 0,
      window_start: new Date(),
      window_duration_ms: windowDurationMs,
      max_requests: maxRequests,
    });
  }

  public static async checkRateLimit(licenseId: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    rateLimit: RateLimit;
  }> {
    let rateLimit = await RateLimit.findByLicenseId(licenseId);

    if (!rateLimit) {
      // Create default rate limit based on license type
      const license = await License.findByPk(licenseId);
      if (!license) {
        throw new Error('License not found');
      }

      const config = RateLimit.getRateLimitConfig(license.type);
      rateLimit = await RateLimit.createForLicense(
        licenseId,
        config.maxRequests,
        config.windowDurationMs
      );
    }

    const allowed = rateLimit.canMakeRequest();
    const remaining = rateLimit.getRemainingRequests();
    const resetTime = rateLimit.getTimeUntilReset();

    return {
      allowed,
      remaining,
      resetTime,
      rateLimit,
    };
  }

  public static getRateLimitConfig(licenseType: string): {
    maxRequests: number;
    windowDurationMs: number;
  } {
    const configs = {
      free: {
        maxRequests: 1,
        windowDurationMs: 60 * 1000, // 1 minute
      },
      pro_basic: {
        maxRequests: 2,
        windowDurationMs: 60 * 1000, // 1 minute
      },
      pro_premium: {
        maxRequests: 4,
        windowDurationMs: 60 * 1000, // 1 minute
      },
    };

    return configs[licenseType as keyof typeof configs] || configs.free;
  }

  public static async cleanupOldRateLimits(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedCount = await RateLimit.destroy({
      where: {
        updated_at: {
          [Op.lt]: cutoffDate
        }
      }
    });

    return deletedCount;
  }
}

// Initialize the model
RateLimit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    license_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'licenses',
        key: 'id',
      },
    },
    last_request: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    request_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    window_start: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    window_duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60000, // 1 minute
      validate: {
        min: 1000, // Minimum 1 second
      },
    },
    max_requests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
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
    modelName: 'RateLimit',
    tableName: 'rate_limits',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['license_id'],
      },
      {
        fields: ['last_request'],
      },
      {
        fields: ['window_start'],
      },
    ],
  }
);

export default RateLimit;