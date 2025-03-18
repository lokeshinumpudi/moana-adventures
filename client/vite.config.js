import { defineConfig } from 'vite'
import removeConsole from 'vite-plugin-remove-console'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  
  return {
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