import sequelize from '../config/database';
import { License } from './License';
import { Generation } from './Generation';
import { RateLimit } from './RateLimit';

// Define associations
const initializeAssociations = (): void => {
  // License has many Generations
  License.hasMany(Generation, {
    foreignKey: 'license_id',
    as: 'generations',
    onDelete: 'CASCADE',
  });

  // Generation belongs to License
  Generation.belongsTo(License, {
    foreignKey: 'license_id',
    as: 'license',
  });

  // License has one RateLimit
  License.hasOne(RateLimit, {
    foreignKey: 'license_id',
    as: 'rateLimit',
    onDelete: 'CASCADE',
  });

  // RateLimit belongs to License
  RateLimit.belongsTo(License, {
    foreignKey: 'license_id',
    as: 'license',
  });
};

// Initialize all models and associations
const initializeModels = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database models...');

    // Set up associations
    initializeAssociations();

    // Sync models in development only
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synchronized successfully.');
    }

  } catch (error) {
    console.error('❌ Failed to initialize models:', error);
    throw error;
  }
};

// Export models and utilities
export {
  sequelize,
  License,
  Generation,
  RateLimit,
  initializeModels,
  initializeAssociations,
};

// Default export for convenience
export default {
  sequelize,
  License,
  Generation,
  RateLimit,
  initializeModels,
};