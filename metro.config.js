const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");
const defaultConfig = getSentryExpoConfig(__dirname);
defaultConfig.resolver.assetExts.push("cjs");
defaultConfig.resolver.unstable_enablePackageExports = false;
module.exports = defaultConfig;