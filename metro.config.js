// Metro do Expo. O Watchman é desligado porque o do Homebrew desta máquina está quebrado (libfmt);
// sem ele o Metro usa o observador de arquivos próprio, só um pouco mais lento.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.useWatchman = false;

module.exports = config;
