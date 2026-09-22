import ts from 'typescript-eslint';

export default ts.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/drizzle/**'],
  },
  ...ts.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);