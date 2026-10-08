import { verifyToken } from './security/session_manager.mjs';
import { handleAdminLogin } from './authentication/admin_auth_controller.mjs';
import { handleStaffLogin } from './authentication/staff_auth_controller.mjs';
import { handleGetStaffProfile } from './staff/staff_profile_controller.mjs';
import { handleUpdateBusStatus } from './staff/staff_telemetry_controller.mjs';
import { handleCreateIssue, handleGetStaffIssues } from './staff/staff_issues_controller.mjs';
import { handleGetAdminIssues, handleUpdateIssue } from './admin/admin_issues_controller.mjs';
import { handleGetStaff, handleCreateStaff, handleUpdateStaff } from './staff/staff_management_controller.mjs';
import { handleGetBuses, handleCreateBus, handleUpdateBus, handleDeleteBus } from './bus_tracking/buses_controller.mjs';
import { handleGetRoutes, handleCreateRoute, handleUpdateRoute } from './routes/routes_controller.mjs';
import { handleGetStops, handleCreateStop, handleUpdateStop, handleDeleteStop } from './routes/stops_controller.mjs';
import { handleGetAnnouncements, handleCreateAnnouncement, handleUpdateAnnouncement, handleDeleteAnnouncement } from './notifications/announcements_controller.mjs';
import { handleGetActivityLogs } from './admin/admin_activity_logger.mjs';
import { handleSync } from './sync/sync_controller.mjs';
import {
  ingestDriverGps,
  getAllLiveBuses,
  getNotificationHistory,
  addSseClient,
} from './bus_tracking/live_telemetry_engine.mjs';

/**
 * Modular API Router for DCE College Bus Tracker.
 * Each feature route is dispatched to its dedicated modular controller.
 */
export async function handleApiRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  // Only handle /api/* requests
  if (!pathname.startsWith('/api')) {
    return false;
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  // Parse JSON Body for POST/PUT requests
  let body = {};
  if (method === 'POST' || method === 'PUT') {
    try {
      body = await new Promise((resolve) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
          try {
            resolve(raw ? JSON.parse(raw) : {});
          } catch {
            resolve({});
          }
        });
      });
    } catch {
      body = {};
    }
  }

  // Helper response functions
  const json = (data, status = 200) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
    return true;
  };

  const error = (message, status = 400) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: message, success: false }));
    return true;
  };

  const helpers = { json, error };

  // Auth header
  const authHeader = req.headers['authorization'] || '';
  const currentUser = verifyToken(authHeader);

  // 1. ADMIN AUTHENTICATION
  if (pathname === '/api/admin/login' && method === 'POST') {
    return handleAdminLogin(body, helpers);
  }

  // 2. BUS STAFF AUTHENTICATION
  if (pathname === '/api/staff/login' && method === 'POST') {
    return handleStaffLogin(body, helpers);
  }

  // Staff Profile
  if (pathname === '/api/staff/profile' && method === 'GET') {
    return handleGetStaffProfile(currentUser, helpers);
  }

  // 3. BUSES CRUD
  if (pathname === '/api/buses' && method === 'GET') {
    return handleGetBuses(helpers);
  }
  if (pathname === '/api/buses' && method === 'POST') {
    return handleCreateBus(body, currentUser, helpers);
  }
  if (pathname.startsWith('/api/buses/') && method === 'PUT') {
    const id = pathname.replace('/api/buses/', '').trim();
    return handleUpdateBus(id, body, currentUser, helpers);
  }
  if (pathname.startsWith('/api/buses/') && method === 'DELETE') {
    const id = pathname.replace('/api/buses/', '').trim();
    return handleDeleteBus(id, currentUser, helpers);
  }

  // 4. ROUTES & STOPS CRUD
  if (pathname === '/api/routes' && method === 'GET') {
    return handleGetRoutes(helpers);
  }
  if (pathname === '/api/routes' && method === 'POST') {
    return handleCreateRoute(body, currentUser, helpers);
  }
  if (pathname.startsWith('/api/routes/') && method === 'PUT') {
    const id = pathname.replace('/api/routes/', '').trim();
    return handleUpdateRoute(id, body, currentUser, helpers);
  }

  // Stops Endpoints
  if (pathname === '/api/stops' && method === 'GET') {
    return handleGetStops(helpers);
  }
  if (pathname === '/api/stops' && method === 'POST') {
    return handleCreateStop(body, currentUser, helpers);
  }
  if (pathname.startsWith('/api/stops/') && method === 'PUT') {
    const id = pathname.replace('/api/stops/', '').trim();
    return handleUpdateStop(id, body, currentUser, helpers);
  }
  if (pathname.startsWith('/api/stops/') && method === 'DELETE') {
    const id = pathname.replace('/api/stops/', '').trim();
    return handleDeleteStop(id, currentUser, helpers);
  }

  // 5. VOICE ANNOUNCEMENTS CRUD
  if (pathname === '/api/announcements' && method === 'GET') {
    return handleGetAnnouncements(helpers);
  }
  if (pathname === '/api/announcements' && method === 'POST') {
    return handleCreateAnnouncement(body, currentUser, helpers);
  }
  if (pathname.startsWith('/api/announcements/') && method === 'PUT') {
    const id = pathname.replace('/api/announcements/', '').trim();
    return handleUpdateAnnouncement(id, body, currentUser, helpers);
  }
  if (pathname.startsWith('/api/announcements/') && method === 'DELETE') {
    const id = pathname.replace('/api/announcements/', '').trim();
    return handleDeleteAnnouncement(id, currentUser, helpers);
  }

  // 6. BUS STAFF TELEMETRY & STATUS UPDATE
  if (pathname === '/api/staff/bus-status' && (method === 'PUT' || method === 'POST')) {
    return handleUpdateBusStatus(body, currentUser, helpers);
  }
  if ((pathname === '/api/staff/gps' || pathname === '/api/driver/telemetry') && method === 'POST') {
    try {
      const result = ingestDriverGps(body);
      return helpers.json(result);
    } catch (err) {
      return helpers.error(err.message, 400);
    }
  }

  // 6.1. LIVE FLEET TELEMETRY & SSE STREAM
  if (pathname === '/api/live/buses' && method === 'GET') {
    return helpers.json({
      success: true,
      buses: getAllLiveBuses(),
      timestamp: Date.now(),
    });
  }

  if (pathname === '/api/live/history' && method === 'GET') {
    const busFilter = url.searchParams.get('busNumber') || url.searchParams.get('busId');
    return helpers.json({
      success: true,
      history: getNotificationHistory(busFilter),
      timestamp: Date.now(),
    });
  }

  if (pathname === '/api/live/stream' && method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial snapshot
    const initialData = {
      type: 'INIT_SNAPSHOT',
      buses: getAllLiveBuses(),
      history: getNotificationHistory(),
      timestamp: Date.now(),
    };
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    addSseClient(res);
    return true;
  }

  // 7. ISSUE REPORTING (STAFF & ADMIN)
  if (pathname === '/api/staff/issues' && method === 'POST') {
    return handleCreateIssue(body, currentUser, helpers);
  }
  if (pathname === '/api/staff/issues' && method === 'GET') {
    return handleGetStaffIssues(currentUser, helpers);
  }
  if (pathname === '/api/admin/issues' && method === 'GET') {
    return handleGetAdminIssues(helpers);
  }
  if (pathname.startsWith('/api/admin/issues/') && method === 'PUT') {
    const id = pathname.replace('/api/admin/issues/', '').trim();
    return handleUpdateIssue(id, body, currentUser, helpers);
  }

  // 8. STAFF MANAGEMENT (ADMIN)
  if (pathname === '/api/staff' && method === 'GET') {
    return handleGetStaff(helpers);
  }
  if (pathname === '/api/staff' && method === 'POST') {
    return handleCreateStaff(body, currentUser, helpers);
  }
  if (pathname.startsWith('/api/staff/') && method === 'PUT') {
    const id = pathname.replace('/api/staff/', '').trim();
    return handleUpdateStaff(id, body, currentUser, helpers);
  }

  // 9. ACTIVITY LOGS (ADMIN AUDIT)
  if (pathname === '/api/admin/activity-logs' && method === 'GET') {
    return handleGetActivityLogs(req, res, helpers);
  }

  // 10. REAL-TIME / SYNC ENDPOINT
  if (pathname === '/api/sync' && method === 'GET') {
    return handleSync(helpers);
  }

  // Unhandled API Route
  return error(`API endpoint not found: ${method} ${pathname}`, 404);
}
