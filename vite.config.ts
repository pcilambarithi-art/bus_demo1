import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function htmlEntryPlugin(): Plugin {
  return {
    name: 'html-entry-transform',
    transformIndexHtml(html) {
      return html
        .replace(/<script>[\s\S]*?app-bundle\.js[\s\S]*?<\/script>/gi, '')
        .replace(/<script\s+type="module"[^>]*src="[^"]*app-bundle\.js"[^>]*><\/script>/gi, '<script type="module" src="/src/main.tsx"></script>')
        .replace(/<link\s+rel="stylesheet"[^>]*href="[^"]*app-bundle\.css"[^>]*>/gi, '')
    }
  }
}

function maplibreDynamicImportPlugin(): Plugin {
  return {
    name: 'maplibre-dynamic-import-ignore',
    enforce: 'pre',
    transform(code, id) {
      if ((id.includes('maplibre-gl') || id.includes('maplibre')) && code.includes('import(')) {
        return {
          code: code.replace(/await\s+import\((?!\/\*\s*@vite-ignore\s*\*\/)\s*([^)]+)\)/g, 'await import(/* @vite-ignore */ $1)'),
          map: null
        }
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [maplibreDynamicImportPlugin(), htmlEntryPlugin(), react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        ws: true,
      }
    }
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'DYNAMIC_IMPORT_VARIABLE' || warning.message?.includes('dynamic import cannot be analyzed')) {
          return
        }
        warn(warning)
      }
    }
  }
})
