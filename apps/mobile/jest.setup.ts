import { jest } from '@jest/globals';
import './src/i18n';

// Reanimated and its worklets run on the UI thread of a device: their mocks run the animations
// at once, as the Reanimated docs advise for tests.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
// The mock has no `useReducedMotion`: the tests run with the animations on.
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
// Firebase Auth and Google Sign-In are native: the render tests run on a fake, anonymous at
// first (`src/test/fakeAuth.ts`).
jest.mock('./src/auth/firebase', () => ({
  createFirebaseAuth: () =>
    jest.requireActual<typeof import('./src/test/fakeAuth')>('./src/test/fakeAuth').fakeAuth
      .provider,
}));
