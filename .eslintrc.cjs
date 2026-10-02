module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  ignorePatterns: ['dist', 'dev-dist', 'node_modules', '*.cjs', 'public/mockServiceWorker.js'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-restricted-imports': ['error', { paths: [
      { name: 'maplibre-gl', message: 'Import map vendors only inside src/services/maps.' },
    ] }],
  },
  overrides: [
    { files: ['src/services/maps/**', 'vite.config.ts', 'e2e/**'], rules: { 'no-restricted-imports': 'off' } },
  ],
}
