require('dotenv').config();

module.exports = {
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
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
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
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
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
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  },
};