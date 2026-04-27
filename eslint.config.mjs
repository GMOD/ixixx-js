import eslint from '@eslint/js'
import importPlugin from 'eslint-plugin-import-x'
import { defineConfig } from 'eslint/config'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['dist/*', 'esm/*', 'eslint.config.mjs'],
  },
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.lint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      eqeqeq: 'error',
      'no-console': [
        'warn',
        {
          allow: ['error', 'warn'],
        },
      ],
      curly: 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      semi: ['error', 'never'],

      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          caughtErrors: 'none',
        },
      ],

      'unicorn/filename-case': 'off',
      'unicorn/no-nested-ternary': 'off',
      'unicorn/prevent-abbreviations': 'off',

      'import-x/extensions': ['error', 'ignorePackages'],
      'import-x/no-unresolved': 'off',
      'import-x/order': [
        'error',
        {
          named: true,
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
          },
          groups: [
            'builtin',
            ['external', 'internal'],
            ['parent', 'sibling', 'index', 'object'],
            'type',
          ],
        },
      ],
    },
  },
)
