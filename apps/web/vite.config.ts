import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

const config: UserConfig = {
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Community',
        short_name: 'Community',
        description: 'Geliştiriciler için topluluk platformu',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        lang: 'tr',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { navigateFallbackDenylist: [/^\/api\//], runtimeCaching: [] },
    }),
  ],
  server: {
    port: Number(process.env.PORT ?? 5173),
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
} as UserConfig;

export default defineConfig(config);