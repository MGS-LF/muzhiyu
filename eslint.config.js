import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      'eqeqeq': ['warn', 'always'],
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'vendor/**',
      'archive/**',
      'node_modules/**',
      'cache/**',
      'dist/**',
      'coverage/**',
    ],
  },
];
