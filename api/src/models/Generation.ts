import { DataTypes, Model, Optional, BelongsToGetAssociationMixin, Op } from 'sequelize';
import sequelize from '../config/db';
import { License } from './License';

// Generation attributes interface
export interface GenerationAttributes {
  id: number;
  license_id: number;
  product_id: string;
  user_image_hash: string;
  product_image_hash: string;
  result_image_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  processing_time_ms?: number;
  google_ai_request_id?: string;
  used_prompt?: string;
  metadata?: object;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

// Optional attributes for creation
export interface GenerationCreationAttributes extends Optional<GenerationAttributes, 'id' | 'created_at' | 'updated_at'> { }

// Generation model class
export class Generation extends Model<GenerationAttributes, GenerationCreationAttributes> implements GenerationAttributes {
  public id!: number;
  public license_id!: number;
  public product_id!: string;
  public user_image_hash!: string;
  public product_image_hash!: string;
  public result_image_url?: string;
  public status!: 'pending' | 'processing' | 'completed' | 'failed';
  public error_message?: string;
  public processing_time_ms?: number;
  public google_ai_request_id?: string;
  public used_prompt?: string;
  public metadata?: object;
  public created_at!: Date;
  public updated_at!: Date;
  public completed_at?: Date;

  // Associations
  public getLicense!: BelongsToGetAssociationMixin<License>;

  // Instance methods
  public isCompleted(): boolean {
    return this.status === 'completed';
  }

  public isFailed(): boolean {
    return this.status === 'failed';
  }

  public isProcessing(): boolean {
    return this.status === 'processing';
  }

  public isPending(): boolean {
    return this.status === 'pending';
  }

  public async markAsProcessing(googleAiRequestId?: string): Promise<void> {
    this.status = 'processing';
    if (googleAiRequestId) {
      this.google_ai_request_id = googleAiRequestId;
    }
    await this.save();
  }

  public async markAsCompleted(resultImageUrl: string, processingTimeMs?: number, usedPrompt?: string): Promise<void> {
    this.status = 'completed';
    this.result_image_url = resultImageUrl;
    this.completed_at = new Date();
    if (processingTimeMs) {
      this.processing_time_ms = processingTimeMs;
    }
    if (usedPrompt) {
      this.used_prompt = usedPrompt;
    }
    await this.save();
  }

  public async markAsFailed(errorMessage: string): Promise<void> {
    this.status = 'failed';
    this.error_message = errorMessage;
    this.completed_at = new Date();
    await this.save();
  }

  public getProcessingDuration(): number | null {
    if (!this.completed_at) return null;
    return this.completed_at.getTime() - this.created_at.getTime();
  }

  // Static methods
  public static async findByLicenseId(licenseId: number, limit: number = 10): Promise<Generation[]> {
    return await Generation.findAll({
      where: { license_id: licenseId },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  public static async findPendingGenerations(): Promise<Generation[]> {
    return await Generation.findAll({
      where: { status: 'pending' },
      order: [['created_at', 'ASC']],
    });
  }

  public static async getUsageStats(licenseId: number, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    processing: number;
  }> {
    const whereClause: Record<string, unknown> = { license_id: licenseId };

    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [startDate, endDate]
      };
    }

    const [total, completed, failed, pending, processing] = await Promise.all([
      Generation.count({ where: whereClause }),
      Generation.count({ where: { ...whereClause, status: 'completed' } }),
      Generation.count({ where: { ...whereClause, status: 'failed' } }),
      Generation.count({ where: { ...whereClause, status: 'pending' } }),
      Generation.count({ where: { ...whereClause, status: 'processing' } }),
    ]);

    return { total, completed, failed, pending, processing };
  }

  public static async cleanupOldGenerations(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedCount = await Generation.destroy({
      where: {
        created_at: {
          [Op.lt]: cutoffDate
        },
        status: {
          [Op.in]: ['completed', 'failed']
        }
      }
    });

    return deletedCount;
  }
}

// Initialize the model
Generation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    license_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'licenses',
        key: 'id',
      },
    },
    product_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    user_image_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [32, 64],
      },
    },
    product_image_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [32, 64],
      },
    },
    result_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processing_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    google_ai_request_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    used_prompt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
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
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Generation',
    tableName: 'generations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['license_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['product_id'],
      },
      {
        fields: ['user_image_hash', 'product_image_hash'],
        name: 'idx_image_hashes',
      },
      {
        fields: ['google_ai_request_id'],
      },
    ],
  }
);

export default Generation;