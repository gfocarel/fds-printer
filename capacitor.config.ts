import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gfocarel.fdsprinter',
  appName: 'FDS Printer',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
      signingType: 'apksigner'
    }
  }
};

export default config;
