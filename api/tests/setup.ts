// Jest setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.GOOGLE_AI_API_KEY = 'test-api-key';
process.env.DB_NAME_TEST = 'mirrorly_test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'root';
process.env.DB_PASS = 'root';
process.env.DB_PORT = '10016';

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);