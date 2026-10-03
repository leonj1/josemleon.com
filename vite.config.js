import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  server: {
    proxy: {
      '/metrics': {
        target: 'http://127.0.0.1:9091',
      },
    },
  },
  preview: {
    allowedHosts: ['amd.tail6f8ba5.ts.net', '.ts.net'],
  },
});
