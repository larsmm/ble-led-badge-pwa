import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const githubPagesBase = "/ble-led-badge-pwa/";

export default defineConfig(({ mode }) => {
  const appBase = mode === "github-pages" ? githubPagesBase : "/";

  return {
    base: appBase,
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["pwa-icon.svg"],
        manifest: {
          name: "BLE LED Badge",
          short_name: "LED Badge",
          description: "Android PWA to control BLE LED name tags over Web Bluetooth.",
          theme_color: "#0e5a47",
          background_color: "#f6efe1",
          display: "standalone",
          scope: appBase,
          start_url: appBase,
          icons: [
            {
              src: "pwa-icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any"
            }
          ]
        }
      })
    ],
    server: {
      host: true,
      port: 5173
    }
  };
});
