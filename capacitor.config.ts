import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.college.bustracker',
  appName: 'College Bus Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#070B19'
  }
};

export default config;
