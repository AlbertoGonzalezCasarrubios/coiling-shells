// ESLint configuration (npm run lint). The app runs in the browser without a
// build step; the tests and this file run in Node.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'other/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['js/workers/**/*.js'],
    languageOptions: { globals: globals.worker },
  },
  {
    files: ['tests/**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // Unused arguments are kept when they document a callback's signature
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
