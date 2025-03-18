import { defineConfig } from 'vite'
import removeConsole from 'vite-plugin-remove-console'

export default defineConfig(({ command, mode }) => {
  const config = {
    // ... other existing config options
    
    plugins: [
      // ... other plugins you might have
    ],
    
    build: {
      // ... other build options you might have
      minify: 'terser',
      terserOptions: {
        compress: {
          // Remove console.logs in production, but keep console.warn and console.error
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
          // Preserve console.warn and console.error
          pure_funcs: process.env.NODE_ENV === 'production' 
            ? ['console.log', 'console.info']
            : []
        }
      }
    }
  }

  // Only add removeConsole plugin in production
  if (mode === 'production') {
    config.plugins.push(
      removeConsole({
        includes: ['log', 'info'],
        excludes: ['warn', 'error'] // Keep warning and error logs
      })
    )
  }

  return config
}) 