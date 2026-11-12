// Regras de lint do Prontuário da Família.
// Arquitetura: Feature-Sliced Design (camadas) + Clean Architecture (segmentos domain/data/ui).
// Veja docs/ARCHITECTURE.md para o racional de cada regra.
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');

// Camadas FSD, da mais alta para a mais baixa. Uma camada só importa das camadas abaixo dela.
// `routes` = src/app (rotas do expo-router, finas); `app` = src/application (providers, composição/DI).
const LAYERS = ['routes', 'app', 'screens', 'widgets', 'features', 'entities', 'shared'];
const below = (layer) => LAYERS.slice(LAYERS.indexOf(layer) + 1);

// Pacotes de infraestrutura/framework proibidos dentro de domain/ (domínio puro, testável sem RN).
const FRAMEWORK_IMPORTS = [
  'react',
  'react-native',
  'react-native-*',
  'expo',
  'expo-*',
  '@expo/*',
  '@supabase/*',
  '@react-native-async-storage/*',
  '@tanstack/*',
  'zustand',
];

const PUBLIC_API = {
  regex: '^@/(screens|widgets|features|entities)/[^/]+/.+',
  message: 'Fora do slice, importe pela API pública: @/<camada>/<slice> (index.ts). Dentro do slice, use caminhos relativos.',
};

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'node_modules/*', 'supabase/functions/*', 'ios/*', 'android/*']),
  expoConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' } },
      'boundaries/legacy-templates': false,
      'boundaries/elements': [
        { type: 'routes', pattern: 'src/app', partialMatch: false },
        { type: 'app', pattern: 'src/application', partialMatch: false },
        { type: 'screens', pattern: 'src/screens/*', partialMatch: false, capture: ['slice'] },
        { type: 'widgets', pattern: 'src/widgets/*', partialMatch: false, capture: ['slice'] },
        { type: 'features', pattern: 'src/features/*', partialMatch: false, capture: ['slice'] },
        { type: 'entities', pattern: 'src/entities/*', partialMatch: false, capture: ['slice'] },
        { type: 'shared', pattern: 'src/shared/*', partialMatch: false, capture: ['segment'] },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        2,
        {
          default: 'disallow',
          message:
            'FSD: "{{ from.element.types.[0] }}" não pode importar "{{ to.element.types.[0] }}". Camadas só importam camadas abaixo (ver docs/ARCHITECTURE.md).',
          policies: [
            // Dentro do mesmo slice, tudo é permitido (as regras Clean domain/data/ui ficam no no-restricted-imports abaixo).
            ...['screens', 'widgets', 'features', 'entities'].map((type) => ({
              from: { element: { type } },
              allow: { to: { element: { type, captured: { slice: '{{ from.element.captured.slice }}' } } } },
            })),
            { from: { element: { type: 'routes' } }, allow: { to: { element: { type: 'routes' } } } },
            { from: { element: { type: 'app' } }, allow: { to: { element: { type: 'app' } } } },
            { from: { element: { type: 'shared' } }, allow: { to: { element: { type: 'shared' } } } },
            // Camadas importam apenas as camadas abaixo.
            ...LAYERS.filter((l) => l !== 'shared').map((layer) => ({
              from: { element: { type: layer } },
              allow: { to: { element: { types: below(layer) } } },
            })),
          ],
        },
      ],
    },
  },
  // Fora do próprio slice, importe somente pela API pública (index.ts) do slice.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [PUBLIC_API] }] },
  },
  // Clean Architecture: domain é puro (sem React, RN, Expo, Supabase) e não depende de data/ui.
  {
    files: ['src/entities/*/domain/**/*.{ts,tsx}', 'src/features/*/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            PUBLIC_API,
            { group: FRAMEWORK_IMPORTS, message: 'domain/ deve ser TypeScript puro: sem framework ou infraestrutura.' },
            { group: ['**/data', '**/data/**', '**/ui', '**/ui/**'], message: 'domain/ não depende de data/ nem ui/.' },
          ],
        },
      ],
    },
  },
  // data/ implementa portas do domínio; não conhece ui/.
  {
    files: ['src/entities/*/data/**/*.{ts,tsx}', 'src/features/*/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [PUBLIC_API, { group: ['**/ui', '**/ui/**'], message: 'data/ não depende de ui/.' }] },
      ],
    },
  },
  // OCR: o texto lido é dado de saúde e nunca vai para log (spec F1.15, ocr-tecnico.md, privacy.test.ts).
  {
    files: ['src/features/read-document/**/*.{ts,tsx}', 'modules/document-text/src/**/*.{ts,tsx}'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'jest.setup.ts'],
    languageOptions: { globals: { jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' } },
  },
]);
