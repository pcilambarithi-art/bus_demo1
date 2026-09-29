import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
// @ts-ignore
import { handleApiRequest } from './server/apiRouter.mjs'

// Vite plugin to embed DCE Transit REST API directly in the dev server
function dceTransitApiPlugin(): Plugin {
  return {
    name: 'dce-transit-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          try {
            const handled = await handleApiRequest(req, res);
            if (handled) return;
          } catch (err) {
            console.error('[API Middleware Error]', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal Server Error', message: (err as any)?.message }));
            return;
          }
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          try {
            const handled = await handleApiRequest(req, res);
            if (handled) return;
          } catch (err) {
            console.error('[API Preview Error]', err);
          }
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), dceTransitApiPlugin()],
  server: {
    port: 5173,
    host: true
  }
})
