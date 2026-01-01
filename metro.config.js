const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("cjs");
config.resolver.unstable_enablePackageExports = false;

module.exports = config;