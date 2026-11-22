import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const BASE_RESTRICTED_SYNTAX = [
  {
    selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
    message: 'Raw HTML injection is banned. Render structured JSX or justify explicitly.',
  },
  {
    selector: 'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]',
    message: 'Direct innerHTML/outerHTML assignment is banned. Use textContent or replaceChildren().',
  },
  {
    selector: 'CallExpression[callee.property.name="insertAdjacentHTML"]',
    message: 'insertAdjacentHTML is banned.',
  },
  {
    selector: 'CallExpression[callee.object.name="document"][callee.property.name="write"]',
    message: 'document.write is banned.',
  },
  {
    selector: 'TemplateElement[value.raw=/[?&](key|api_key|token|secret)=/i]',
    message: 'Never pass secrets in URL query strings. Send API keys via HTTP headers.',
  },
];

export default [
  { ignores: ['dist/**'] },
  {
    files: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': ['error', ...BASE_RESTRICTED_SYNTAX],
    },
  },
  // Pure logic and store layers: no UI components, no DOM globals
  {
    files: ['src/store/**/*.ts', 'src/lib/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'document', message: 'Logic/store modules must stay free of DOM access.' },
        { name: 'window', message: 'Logic/store modules must stay free of window/DOM access.' },
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react-dom', message: 'Logic/store modules must not import react-dom.' },
          ],
          patterns: [
            {
              group: ['**/components/*', '**/components/**'],
              message: 'Logic/store modules must not import UI components.',
            },
          ],
        },
      ],
    },
  },
  // Explicit allowlist for existing browser-API utility modules in src/lib/
  {
    files: [
      'src/lib/device-pairing.ts',
      'src/lib/particle-celebration.ts',
      'src/lib/smart-document-parser.ts',
    ],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
  // UI components: no direct runtime DB / Supabase SDK imports (type imports like Entry allowed)
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'UI components must access Supabase via hooks/stores, not directly.',
            },
          ],
          patterns: [
            {
              group: ['**/lib/supabase', '**/lib/db'],
              importNames: ['supabase', 'ensureAuth', 'db'],
              message: 'UI components must access Supabase/IndexedDB via hooks/stores, not directly.',
            },
          ],
        },
      ],
    },
  },
  // Legacy ratchet exemption: DevicePairModal (657 lines, tracked for dedicated refactor)
  {
    files: ['src/components/DevicePairModal.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  // Hooks: no runtime imports from UI components (type-only imports allowed)
  {
    files: ['src/hooks/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/components/*', '**/components/**'],
              allowTypeImports: true,
              message: 'Hooks must not import runtime values from UI components (use import type if needed).',
            },
          ],
        },
      ],
    },
  },
  // Server API handlers: require explicit timeout/abort signal on every fetch()
  {
    files: ['api/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...BASE_RESTRICTED_SYNTAX,
        {
          selector: 'CallExpression[callee.name="fetch"]:not(:has(ObjectExpression > Property[key.name="signal"]))',
          message: 'Server fetch() calls must pass an explicit signal (e.g. AbortSignal.timeout(10_000)).',
        },
      ],
    },
  },
];
