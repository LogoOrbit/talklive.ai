// ESLint: catch real bugs (undefined names, unreachable code, duplicate keys,
// bad comparisons) without restyling a codebase that has its own style.
// `npm run lint` must stay at zero errors; warnings are for cleanup.
const js = require('@eslint/js');
const globals = require('globals');

const rules = {
  ...js.configs.recommended.rules,
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
  'no-empty': ['warn', { allowEmptyCatch: true }],
  'no-useless-escape': 'off',
  'no-control-regex': 'off',
  'no-misleading-character-class': 'off',
  'no-prototype-builtins': 'off',
  'no-cond-assign': ['error', 'except-parens'],
};

module.exports = [
  {
    ignores: [
      'node_modules/**', 'build/**', 'mobile/**', 'marketing/**', 'data/**',
      'public/**/*.min.js', 'public/i18n/**',
    ],
  },
  {
    files: ['server/**/*.js', 'scripts/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node } },
    rules,
  },
  {
    // Browser test harnesses evaluate functions inside the page, where the
    // app's own globals (openFriendChat, ...) exist.
    files: ['scripts/social-ui/**/*.js', 'scripts/record-voice-tutorial.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-undef': 'off' },
  },
  {
    // Plain <script> files sharing one page scope, so names defined in one
    // file are used in another; no-undef cannot see across them.
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, io: 'readonly' },
    },
    rules: { ...rules, 'no-undef': 'off', 'no-unused-vars': 'off', 'no-redeclare': 'off' },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
];
