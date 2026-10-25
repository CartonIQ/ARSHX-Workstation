import type { CapacitorConfig } from '@capacitor/cli';

// Application ID is kept as-is so existing installs and Play listings stay valid.
const config: CapacitorConfig = {
  appId: 'com.arshx.workstation',
  appName: 'ARSHX',
  webDir: 'dist',
  backgroundColor: '#0B0B10',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
