// Setup global de testes: mock oficial do AsyncStorage. O expo-file-system usa o mock em memória que o jest-expo
// já injeta; testes de arquivos limpam o estado com `clearLocalFiles()` de `@/shared/lib` no `beforeEach`.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
