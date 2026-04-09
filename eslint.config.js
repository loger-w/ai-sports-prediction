// @ts-check
import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  { ignores: ['eslint.config.js', 'vite.config.ts'] },
  ...tanstackConfig,
  {
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      'import/order': 'off',
    },
  },
]
