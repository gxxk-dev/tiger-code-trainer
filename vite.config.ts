import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = process.env.VITE_BASE_PATH ?? '/'
const buildCommit = (process.env.VITE_BUILD_COMMIT ?? readGitCommit()).slice(0, 7)
const buildDate = process.env.VITE_BUILD_DATE ?? new Date().toISOString()

export default defineConfig({
  base: basePath,
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
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
        id: basePath,
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})

function readGitCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
}
