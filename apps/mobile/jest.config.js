// Render tests of the components (React Native Testing Library): `*.test.tsx` only. Logic tests
// stay in Vitest (`*.test.ts`). Packages that ship untranspiled code are transformed, through
// the `.pnpm` folder where pnpm installs them.
const untranspiled = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  'expo(-.*)?',
  '@expo(-google-fonts)?/.*',
  'expo-router',
  'nativewind',
  'react-native-css-interop',
  'react-native-.*',
  '@gorhom/.*',
  'phosphor-react-native',
  '@shopify/.*',
  '@sentry/react-native',
  '@rnmapbox/maps',
  'posthog-react-native',
];

module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    `node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(${untranspiled.join('|')})/)`,
  ],
};
