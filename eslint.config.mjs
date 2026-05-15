import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.angular/**',
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      '**/logs/**',
      '**/*.log'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'sonarjs': sonarjs
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-var-requires': 'off',

      // SonarJS rules
      'sonarjs/cognitive-complexity': ['error', 20],
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/no-small-switch': 'warn',

      // General rules
      'no-console': 'off',
      'no-undef': 'off' // TypeScript handles this
    }
  }
];
