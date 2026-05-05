import { defineConfig } from 'vite'
import removeConsole from 'vite-plugin-remove-console'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    // Load .env / .env.production from the monorepo root so client + server share one config
    envDir: resolve(__dirname, '..'),

    plugins: [
      isProduction && removeConsole({
        includes: ['log', 'info', 'debug'],
        excludes: ['warn', 'error']
      })
    ].filter(Boolean),
    
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction
        }
      },
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    esbuild: {
      drop: ['console', 'debugger']
    }
  }
}) 