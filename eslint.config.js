import js from '@eslint/js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js', 'scripts/**/*.mjs', '*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        HTMLElement: 'readonly',
        structuredClone: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
];
