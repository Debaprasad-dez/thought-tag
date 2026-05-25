import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.debaprasad.thoughttag',
  appName: 'Thought Tag',
  webDir: 'dist',
  server: {
    url: 'https://debaprasad-dez.github.io/thought-tag/',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
