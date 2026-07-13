import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // The 5000-character offline lookup table is intentionally a lazy chunk.
    chunkSizeWarningLimit: 1400,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'assets/tiger-root-chart.webp',
        'assets/tiger-root-chart-dark.webp',
      ],
      manifest: {
        name: '虎序 - 虎码学习器',
        short_name: '虎序',
        description: '从字根到流畅输入的虎码交互式训练器。',
        theme_color: '#f7f7f5',
        background_color: '#f7f7f5',
        display: 'standalone',
        lang: 'zh-CN',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
