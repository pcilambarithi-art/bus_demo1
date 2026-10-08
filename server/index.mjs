import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleApiRequest } from './apiRouter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const PORT = process.env.PORT || 5000;

const server = http.createServer(async (req, res) => {
  // 1. API Endpoints Handler (/api/*)
  if (req.url && req.url.startsWith('/api')) {
    try {
      const handled = await handleApiRequest(req, res);
      if (handled) return;
    } catch (err) {
      console.error('[API Server Error]', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
      return;
    }
  }

  // 2. Unified Static Frontend Asset Serving (dist/) with SPA Fallback
  if (req.method === 'GET' || req.method === 'HEAD') {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      let pathname = decodeURIComponent(parsedUrl.pathname);
      if (pathname === '/') pathname = '/index.html';

      let filePath = path.join(DIST_DIR, pathname);

      // Security check: ensure path stays within DIST_DIR
      if (!filePath.startsWith(DIST_DIR)) {
        res.statusCode = 403;
        res.end('Access Denied');
        return;
      }

      // If requested file exists, serve it with proper MIME type
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      // SPA Client-side routing fallback: serve index.html for application routes
      const indexPath = path.join(DIST_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
    } catch (err) {
      console.error('[Static Server Error]', err);
    }
  }

  // Fallback 404
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Resource not found', path: req.url }));
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 DCE Unified Full-Stack Bus Transit Server`);
  console.log(`🌐 Unified URL:         http://localhost:${PORT}`);
  console.log(`💻 Frontend Client:     Active (Serving / and SPA routes)`);
  console.log(`📡 Backend API:         Active (Serving /api/*)`);
  console.log(`🛡️  Admin Console:       http://localhost:${PORT}/#admin`);
  console.log(`🔄 Fleet Sync:          GET http://localhost:${PORT}/api/sync`);
  console.log(`======================================================\n`);
});
