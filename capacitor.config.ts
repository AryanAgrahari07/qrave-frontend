import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qrave.app',
  appName: 'Orderzi',
  webDir: 'dist/public',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#050505',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050505',
      overlaysWebView: false,
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#050505',
    webContentsDebuggingEnabled: true,
  },
};

export default config;
