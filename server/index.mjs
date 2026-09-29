import http from 'http';
import { handleApiRequest } from './apiRouter.mjs';

const PORT = process.env.PORT || 5000;

const server = http.createServer(async (req, res) => {
  try {
    const handled = await handleApiRequest(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Endpoint not found', path: req.url }));
    }
  } catch (err) {
    console.error('[Server Error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 DCE Centralized Bus Transit API Server`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🛡️  Admin Web Endpoint: POST /api/admin/login`);
  console.log(`🚌 Bus Staff Endpoint:  POST /api/staff/login`);
  console.log(`🔄 Fleet Sync:          GET  /api/sync`);
  console.log(`======================================================\n`);
});
