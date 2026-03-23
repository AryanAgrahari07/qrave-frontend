import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qrave.app',
  appName: 'Orderzi',
  webDir: 'dist/public',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#0A0A0F',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0F',
      overlaysWebView: false,
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0A0A0F',
  },
};

export default config;
