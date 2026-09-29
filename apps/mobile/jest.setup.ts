import { jest } from '@jest/globals';
import './src/i18n';

// Reanimated and its worklets run on the UI thread of a device: their mocks run the animations
// at once, as the Reanimated docs advise for tests.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));
