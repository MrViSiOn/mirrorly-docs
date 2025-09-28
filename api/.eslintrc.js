module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: [
    'eslint:recommended',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    // Solo errores críticos que pueden romper el código
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/no-explicit-any': 'off', // Permitir any en desarrollo
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'no-console': 'off', // Permitir console.log en desarrollo
    'prefer-const': 'warn',
    // Solo errores que realmente rompen el código
    'no-undef': 'error',
    'no-dupe-keys': 'error',
    'no-unreachable': 'error',
  },
  overrides: [
    {
      // Archivos de scripts y tests - sin restricciones
      files: ['src/scripts/**/*.ts', 'src/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'no-unused-vars': 'off',
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  env: {
    node: true,
    es6: true,
    jest: true,
  },
};
