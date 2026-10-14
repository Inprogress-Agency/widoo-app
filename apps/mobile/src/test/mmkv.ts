/** `react-native-mmkv` for the tests, in memory: `jest.mock('react-native-mmkv', () => …)`. */
export function createMMKV() {
  const values = new Map<string, string>();
  return {
    getString: (key: string) => values.get(key),
    set: (key: string, value: string) => void values.set(key, value),
  };
}
