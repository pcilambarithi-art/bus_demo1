import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function htmlEntryPlugin(): Plugin {
  return {
    name: 'html-entry-transform',
    transformIndexHtml(html) {
      return html
        .replace(/<script\s+type="module"[^>]*src="[^"]*app-bundle\.js"[^>]*><\/script>/gi, '<script type="module" src="/src/main.tsx"></script>')
        .replace(/<link\s+rel="stylesheet"[^>]*href="[^"]*app-bundle\.css"[^>]*>/gi, '')
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [htmlEntryPlugin(), react()],
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
  }
})
