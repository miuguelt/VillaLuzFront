import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Project pragmatics: relax strict TS rules for faster iteration
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
        },
      ],
      // Common DX tweaks
      'no-irregular-whitespace': 'off',
      'prefer-const': 'warn',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  // Disable Fast Refresh rule for context providers and entrypoint where mixed exports are expected
  {
    files: [
      'src/context/*.tsx',
      'src/main.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
