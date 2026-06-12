// AsyncStorage mock for tests.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Stable device locale + initialized i18n so components using t() render labels.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));
require('@/lib/i18n');
