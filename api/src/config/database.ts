import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'mysql';
  pool: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
  logging: boolean | ((sql: string) => void);
  timezone: string;
}

// Environment-specific configurations
const config: { [key: string]: DatabaseConfig } = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'mirrorly_dev',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    dialect: 'mysql',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      min: parseInt(process.env.DB_POOL_MIN || '0'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
  },
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME_TEST || 'mirrorly_test',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
    timezone: '+00:00',
  },
  production: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'mirrorly_prod',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    dialect: 'mysql',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
    },
    logging: false,
    timezone: '+00:00',
  },
};

// Get current environment
const environment = process.env.NODE_ENV || 'development';
const currentConfig = config[environment];

// Create Sequelize instance
const sequelize = new Sequelize(
  currentConfig.database,
  currentConfig.username,
  currentConfig.password,
  {
    host: currentConfig.host,
    port: currentConfig.port,
    dialect: currentConfig.dialect,
    pool: currentConfig.pool,
    logging: currentConfig.logging,
    timezone: currentConfig.timezone,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  }
);

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
};

// Close database connection
export const closeConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('🔌 Database connection closed.');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

export { sequelize, config };
export default sequelize;