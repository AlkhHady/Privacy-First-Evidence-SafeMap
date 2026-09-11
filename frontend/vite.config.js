import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  server: {
    port: 5500,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(frontendRoot, "index.html"),
        login: resolve(frontendRoot, "login.html"),
        register: resolve(frontendRoot, "register.html"),
        forgotPassword: resolve(frontendRoot, "forgot-password.html"),
        updatePassword: resolve(frontendRoot, "update-password.html"),
        evidence: resolve(frontendRoot, "evidence.html"),
        reports: resolve(frontendRoot, "reports.html"),
        reportDetail: resolve(frontendRoot, "report-detail.html"),
        safemap: resolve(frontendRoot, "safemap.html")
      }
    }
  }
});
