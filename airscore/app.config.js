/**
 * This file allows conditional expo-dev-client support based on an environment variable.
 * If USE_DEV_CLIENT is set to 'true', the expo-dev-client plugin will be included.
 * Uncomment the code below to enable this functionality.
 * To install the dev client, run:
 *   npx expo install expo-dev-client
 * Run the app, run the command with USE_DEV_CLIENT=true to enable it:
 *   USE_DEV_CLIENT=true npx expo start --dev-client
*/

import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "AirScore",
  slug: "airscore",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    eas: {
      projectId: "6490c77f-eb62-400f-ba45-9165be425a35",
    },
  },
  owner: "jlayne246",

  // Example of conditional plugin usage (commented out):
  // plugins: process.env.USE_DEV_CLIENT === "true" ? ["expo-dev-client"] : [],
  /* plugins: [
      ...(config.plugins || []),
      ...(process.env.USE_DEV_CLIENT === 'true' ? ['expo-dev-client'] : []),
    ], */
});

