import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5500,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        forgotPassword: resolve(__dirname, 'forgot-password.html'),
        evidence: resolve(__dirname, 'evidence.html'),
        reports: resolve(__dirname, 'reports.html'),
        reportDetail: resolve(__dirname, 'report-detail.html'),
        safemap: resolve(__dirname, 'safemap.html'),
      },
    },
  },
});
