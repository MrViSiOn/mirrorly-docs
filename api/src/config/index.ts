import sequelize, { testConnection, closeConnection } from './db';

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database connection...');

    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to establish database connection');
    }

    // Sync models in development (will be handled by migrations in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Syncing database models...');
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synced successfully.');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Graceful shutdown
export const shutdownDatabase = async (): Promise<void> => {
  console.log('🔄 Shutting down database connection...');
  await closeConnection();
};

export { sequelize, testConnection, closeConnection };
export default sequelize;