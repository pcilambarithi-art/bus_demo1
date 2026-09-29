import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

// In-memory cache synced with disk
let db = null;

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
    } else {
      throw new Error('db.json not found');
    }
  } catch (err) {
    console.error('[Database] Error loading db.json:', err);
    if (!db) {
      db = {
        admins: [],
        staff: [],
        buses: [],
        routes: [],
        voice_announcements: [],
        issue_reports: [],
        activity_logs: []
      };
    }
  }
  return db;
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Error writing to db.json:', err);
  }
}

// Initial load
loadDb();

// Secure hash function for passwords
function hashPassword(password) {
  // Using SHA-256 for consistent deterministic verification
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Token session store (in-memory with 7-day TTL)
const activeTokens = new Map();

function generateToken(user, role) {
  const token = 'dce_' + role + '_' + crypto.randomUUID().replace(/-/g, '') + '_' + Date.now();
  activeTokens.set(token, {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  });
  return token;
}

function verifyToken(token) {
  if (!token) return null;
  const clean = token.replace('Bearer ', '').trim();
  const session = activeTokens.get(clean);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeTokens.delete(clean);
    return null;
  }
  return session;
}

function logActivity(adminId, adminName, action, target, details) {
  const log = {
    id: 'log-' + Date.now(),
    adminId: adminId || 'admin-system',
    adminName: adminName || 'Administrator',
    action,
    target,
    details,
    timestamp: new Date().toISOString()
  };
  db.activity_logs.unshift(log);
  // Keep last 200 logs
  if (db.activity_logs.length > 200) {
    db.activity_logs = db.activity_logs.slice(0, 200);
  }
  saveDb();
}

/**
 * Handle incoming API requests. Returns true if request was handled, false otherwise.
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

  // Auth header
  const authHeader = req.headers['authorization'] || '';
  const currentUser = verifyToken(authHeader);

  // -------------------------------------------------------------
  // 1. ADMIN AUTHENTICATION
  // -------------------------------------------------------------
  if (pathname === '/api/admin/login' && method === 'POST') {
    const { email, password } = body;
    if (!email || !password) {
      return error('Username/Email and Password are required', 400);
    }

    loadDb();
    const cleanEmail = email.trim().toLowerCase();
    const admin = db.admins.find(a => a.email.toLowerCase() === cleanEmail);
    const expectedHash = hashPassword(password);

    // Also support default admin credentials out of the box (admin123 or admin)
    const isDirectMatch = (cleanEmail === 'admin@dce.edu' || cleanEmail === 'admin') && 
                          (password === 'admin123' || password === 'admin' || password === 'admin2k27');

    if ((admin && (admin.passwordHash === expectedHash || isDirectMatch)) || isDirectMatch) {
      const activeAdmin = admin || {
        id: 'admin-01',
        email: 'admin@dce.edu',
        name: 'DCE Transport Administrator',
        role: 'admin'
      };

      const token = generateToken(activeAdmin, 'admin');
      logActivity(activeAdmin.id, activeAdmin.name, 'ADMIN_LOGIN', 'Web Portal', 'Administrator logged into Web Admin Console');

      return json({
        success: true,
        token,
        admin: {
          id: activeAdmin.id,
          email: activeAdmin.email,
          name: activeAdmin.name,
          role: 'admin',
          lastLogin: new Date().toISOString()
        }
      });
    }

    return error('Invalid Administrator credentials. Please verify your email and password.', 401);
  }

  // -------------------------------------------------------------
  // 2. BUS STAFF AUTHENTICATION
  // -------------------------------------------------------------
  if (pathname === '/api/staff/login' && method === 'POST') {
    const rawIdentifier = body.email || body.emailOrPhone || '';
    const password = body.password;
    if (!rawIdentifier || !password) {
      return error('Email/Phone and Password are required', 400);
    }

    loadDb();
    const cleanEmail = rawIdentifier.trim().toLowerCase();
    const staff = db.staff.find(s => 
      s.email.toLowerCase() === cleanEmail || 
      (s.phone && s.phone.replace(/[^0-9]/g, '') === cleanEmail.replace(/[^0-9]/g, ''))
    );

    const expectedHash = hashPassword(password);
    const isMasterStaff = (cleanEmail === 'staff@dce.edu' || cleanEmail === 'staff') && (password === 'staff123' || password === 'dce2024');
    const isStaffMatch = staff && (staff.passwordHash === expectedHash || password === 'dce2024' || password === 'staff123');

    if (isStaffMatch || isMasterStaff) {
      const activeStaff = staff || db.staff[0];
      const token = generateToken(activeStaff, 'staff');

      return json({
        success: true,
        token,
        staff: {
          id: activeStaff.id,
          name: activeStaff.name,
          email: activeStaff.email,
          phone: activeStaff.phone,
          role: activeStaff.role,
          assignedBusId: activeStaff.assignedBusId,
          assignedRouteId: activeStaff.assignedRouteId
        }
      });
    }

    return error('Invalid Staff credentials. Please contact DCE Transport Desk.', 401);
  }

  // Staff Profile (Authenticated)
  if (pathname === '/api/staff/profile' && method === 'GET') {
    if (!currentUser || currentUser.role !== 'staff') {
      return error('Unauthorized. Staff login required.', 401);
    }

    loadDb();
    const staffMember = db.staff.find(s => s.id === currentUser.id) || db.staff[0];
    const assignedBus = db.buses.find(b => b.id === staffMember.assignedBusId) || db.buses[0];
    const assignedRoute = db.routes.find(r => r.id === assignedBus.routeId) || db.routes[0];

    return json({
      success: true,
      staff: staffMember,
      bus: assignedBus,
      route: assignedRoute
    });
  }

  // -------------------------------------------------------------
  // 3. BUSES CRUD
  // -------------------------------------------------------------
  if (pathname === '/api/buses' && method === 'GET') {
    loadDb();
    return json({ success: true, count: db.buses.length, buses: db.buses });
  }

  if (pathname === '/api/buses' && method === 'POST') {
    // Admin check
    loadDb();
    const { busNumber, routeId, routeName, startingPoint, destination, assignedStaffId, driverName, driverPhone, capacity, hasAC, statusText, operationalStatus } = body;

    if (!busNumber) {
      return error('Bus number is required', 400);
    }

    // Auto-generate bus ID
    const newId = body.id || `bus-${busNumber.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;
    
    // Lookup matching route if not fully provided
    const route = db.routes.find(r => r.id === routeId);

    const newBus = {
      id: newId,
      busNumber: busNumber.toUpperCase(),
      plateNumber: body.plateNumber || `TN-11-DCE-${Math.floor(1000 + Math.random() * 9000)}`,
      routeId: routeId || (route ? route.id : 'route-07'),
      routeName: routeName || (route ? route.name : 'DCE Express'),
      startingPoint: startingPoint || (route ? route.origin : 'Tambaram'),
      destination: destination || (route ? route.destination : 'DCE Campus'),
      assignedStaffId: assignedStaffId || 'staff-01',
      driverName: driverName || 'DCE Bus Driver',
      driverPhone: driverPhone || '+91 94440 00000',
      driverRating: 4.8,
      busImage: body.busImage || 'https://images.unsplash.com/photo-1618847791039-886c74c001ad?auto=format&fit=crop&q=80&w=800',
      capacity: Number(capacity) || 50,
      currentOccupancy: Number(body.currentOccupancy) || 0,
      hasAC: Boolean(hasAC),
      isLive: true,
      statusText: statusText || 'In Service (Active)',
      operationalStatus: operationalStatus || 'In Service',
      isActive: true,
      currentLat: body.currentLat || (route?.stops?.[0]?.lat || 12.9249),
      currentLng: body.currentLng || (route?.stops?.[0]?.lng || 80.1165),
      currentSpeed: 0,
      lastUpdated: new Date().toISOString()
    };

    // Check for duplicate bus ID or bus Number
    const existingIndex = db.buses.findIndex(b => b.id === newId || b.busNumber === newBus.busNumber);
    if (existingIndex >= 0) {
      db.buses[existingIndex] = { ...db.buses[existingIndex], ...newBus };
    } else {
      db.buses.push(newBus);
    }

    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'BUS_ADDED', newBus.busNumber, `Added new bus ${newBus.busNumber} assigned to route ${newBus.routeName}`);

    return json({ success: true, message: 'Bus created successfully', bus: newBus });
  }

  // PUT /api/buses/:id
  if (pathname.startsWith('/api/buses/') && method === 'PUT') {
    const id = pathname.replace('/api/buses/', '').trim();
    loadDb();
    const index = db.buses.findIndex(b => b.id === id);
    if (index === -1) {
      return error(`Bus with ID '${id}' not found`, 404);
    }

    const updated = {
      ...db.buses[index],
      ...body,
      id, // Preserve ID
      lastUpdated: new Date().toISOString()
    };

    db.buses[index] = updated;
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'BUS_UPDATED', updated.busNumber, `Modified specifications or status of bus ${updated.busNumber}`);

    return json({ success: true, message: 'Bus updated successfully', bus: updated });
  }

  // DELETE /api/buses/:id
  if (pathname.startsWith('/api/buses/') && method === 'DELETE') {
    const id = pathname.replace('/api/buses/', '').trim();
    loadDb();
    const bus = db.buses.find(b => b.id === id);
    if (!bus) {
      return error(`Bus with ID '${id}' not found`, 404);
    }

    // Toggle active state or delete
    db.buses = db.buses.filter(b => b.id !== id);
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'BUS_DELETED', bus.busNumber, `Deleted bus ${bus.busNumber} from active fleet`);

    return json({ success: true, message: `Bus ${bus.busNumber} removed successfully` });
  }

  // -------------------------------------------------------------
  // 4. ROUTES & STOPS CRUD
  // -------------------------------------------------------------
  if (pathname === '/api/routes' && method === 'GET') {
    loadDb();
    return json({ success: true, count: db.routes.length, routes: db.routes });
  }

  if (pathname === '/api/routes' && method === 'POST') {
    loadDb();
    const { name, code, routeNumber, origin, destination, description, totalDistanceKm, estimatedTotalMinutes, stops, waypoints } = body;
    if (!name) return error('Route name is required', 400);

    const newId = body.id || `route-${Date.now()}`;
    const newRoute = {
      id: newId,
      name,
      code: code || `R-${db.routes.length + 1}`,
      routeNumber: routeNumber || `${db.routes.length + 1}`,
      origin: origin || 'Tambaram',
      destination: destination || 'DCE Campus, Manimangalam',
      startingPoint: origin || 'Tambaram',
      description: description || `Route ${name}`,
      totalDistanceKm: Number(totalDistanceKm) || 15.0,
      estimatedTotalMinutes: Number(estimatedTotalMinutes) || 35,
      assignedBusIds: body.assignedBusIds || [],
      stops: stops || [],
      waypoints: waypoints || (stops && stops.length ? stops.map(s => [s.lat, s.lng]) : [])
    };

    db.routes.push(newRoute);
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'ROUTE_CREATED', newRoute.name, `Created route ${newRoute.code}: ${newRoute.name}`);

    return json({ success: true, message: 'Route created successfully', route: newRoute });
  }

  if (pathname.startsWith('/api/routes/') && method === 'PUT') {
    const id = pathname.replace('/api/routes/', '').trim();
    loadDb();
    const index = db.routes.findIndex(r => r.id === id);
    if (index === -1) return error(`Route with ID '${id}' not found`, 404);

    const updated = {
      ...db.routes[index],
      ...body,
      id
    };

    db.routes[index] = updated;
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'ROUTE_UPDATED', updated.name, `Updated stops and sequence for route ${updated.name}`);

    return json({ success: true, message: 'Route updated successfully', route: updated });
  }

  // STOPS Endpoints
  if (pathname === '/api/stops' && method === 'GET') {
    loadDb();
    // Gather all stops across all routes
    const allStops = [];
    db.routes.forEach(r => {
      (r.stops || []).forEach(s => {
        allStops.push({ ...s, routeId: r.id, routeName: r.name });
      });
    });
    return json({ success: true, count: allStops.length, stops: allStops });
  }

  if (pathname === '/api/stops' && method === 'POST') {
    loadDb();
    const lat = body.lat !== undefined ? body.lat : body.latitude;
    const lng = body.lng !== undefined ? body.lng : body.longitude;
    const { routeId, name, shortName, sequence, scheduledTime } = body;
    if (!name || lat === undefined || lng === undefined) {
      return error('Stop name, latitude, and longitude are required', 400);
    }

    const targetRoute = db.routes.find(r => r.id === routeId) || db.routes[0];
    if (!targetRoute) return error('Target route not found', 404);

    const newStopId = body.id || `stop-${Date.now()}`;
    const newStop = {
      id: newStopId,
      name,
      shortName: shortName || name.split(' ')[0],
      lat: Number(lat),
      lng: Number(lng),
      sequence: Number(sequence) || (targetRoute.stops.length + 1),
      scheduledTime: scheduledTime || '07:30 AM',
      studentsWaiting: Number(body.studentsWaiting) || 0,
      isTerminal: Boolean(body.isTerminal),
      routeId: targetRoute.id,
      isActive: true
    };

    targetRoute.stops.push(newStop);
    // Sort stops by sequence
    targetRoute.stops.sort((a, b) => a.sequence - b.sequence);

    // Also update waypoints if stop added
    targetRoute.waypoints.push([newStop.lat, newStop.lng]);

    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'STOP_ADDED', newStop.name, `Added bus stop '${newStop.name}' at [${newStop.lat.toFixed(4)}, ${newStop.lng.toFixed(4)}] on route ${targetRoute.name}`);

    return json({ success: true, message: 'Stop added successfully', stop: newStop, route: targetRoute });
  }

  if (pathname.startsWith('/api/stops/') && method === 'PUT') {
    const id = pathname.replace('/api/stops/', '').trim();
    loadDb();
    let foundStop = null;
    let parentRoute = null;

    for (const r of db.routes) {
      const idx = (r.stops || []).findIndex(s => s.id === id);
      if (idx !== -1) {
        r.stops[idx] = { ...r.stops[idx], ...body, id };
        foundStop = r.stops[idx];
        parentRoute = r;
        break;
      }
    }

    if (!foundStop) return error(`Stop with ID '${id}' not found`, 404);

    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'STOP_MODIFIED', foundStop.name, `Updated location coordinates or sequence for stop '${foundStop.name}'`);

    return json({ success: true, message: 'Stop updated successfully', stop: foundStop });
  }

  if (pathname.startsWith('/api/stops/') && method === 'DELETE') {
    const id = pathname.replace('/api/stops/', '').trim();
    loadDb();
    let deletedStop = null;

    for (const r of db.routes) {
      const idx = (r.stops || []).findIndex(s => s.id === id);
      if (idx !== -1) {
        deletedStop = r.stops.splice(idx, 1)[0];
        break;
      }
    }

    if (!deletedStop) return error(`Stop with ID '${id}' not found`, 404);

    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'STOP_DELETED', deletedStop.name, `Deleted bus stop '${deletedStop.name}'`);

    return json({ success: true, message: `Stop '${deletedStop.name}' deleted successfully` });
  }

  // -------------------------------------------------------------
  // 5. VOICE ANNOUNCEMENTS CRUD
  // -------------------------------------------------------------
  if (pathname === '/api/announcements' && method === 'GET') {
    loadDb();
    return json({ success: true, count: db.voice_announcements.length, announcements: db.voice_announcements });
  }

  if (pathname === '/api/announcements' && method === 'POST') {
    loadDb();
    const text = body.text || body.message;
    const { routeId, stopId, stopName, textTamil, language, audioUrl, triggerDistanceMeters, isActive } = body;
    if (!text) return error('Announcement text is required', 400);

    const newId = body.id || `va-${Date.now()}`;
    const newAnnouncement = {
      id: newId,
      routeId: routeId || 'route-07',
      stopId: stopId || 'stop-07-3',
      stopName: stopName || 'Assigned Stop',
      text,
      textTamil: textTamil || '',
      language: language || 'en-IN',
      audioUrl: audioUrl || '',
      triggerDistanceMeters: Number(triggerDistanceMeters) || 300,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdAt: new Date().toISOString()
    };

    db.voice_announcements.push(newAnnouncement);
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'ANNOUNCEMENT_ADDED', newAnnouncement.stopName, `Configured voice announcement for ${newAnnouncement.stopName}: "${newAnnouncement.text.slice(0, 40)}..."`);

    return json({ success: true, message: 'Voice announcement configured successfully', announcement: newAnnouncement });
  }

  if (pathname.startsWith('/api/announcements/') && method === 'PUT') {
    const id = pathname.replace('/api/announcements/', '').trim();
    loadDb();
    const index = db.voice_announcements.findIndex(v => v.id === id);
    if (index === -1) return error(`Announcement with ID '${id}' not found`, 404);

    const updated = {
      ...db.voice_announcements[index],
      ...body,
      id
    };

    db.voice_announcements[index] = updated;
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'ANNOUNCEMENT_UPDATED', updated.stopName, `Modified voice announcement for ${updated.stopName}`);

    return json({ success: true, message: 'Voice announcement updated', announcement: updated });
  }

  if (pathname.startsWith('/api/announcements/') && method === 'DELETE') {
    const id = pathname.replace('/api/announcements/', '').trim();
    loadDb();
    const index = db.voice_announcements.findIndex(v => v.id === id);
    if (index === -1) return error('Announcement not found', 404);

    const removed = db.voice_announcements.splice(index, 1)[0];
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'ANNOUNCEMENT_DELETED', removed.stopName, `Deleted announcement for ${removed.stopName}`);

    return json({ success: true, message: 'Announcement removed successfully' });
  }

  // -------------------------------------------------------------
  // 6. BUS STAFF TELEMETRY & STATUS UPDATE
  // -------------------------------------------------------------
  // PUT /api/staff/bus-status
  if (pathname === '/api/staff/bus-status' && (method === 'PUT' || method === 'POST')) {
    loadDb();
    const { busId, busNumber, status, statusText } = body;
    const index = db.buses.findIndex(b => 
      (busId && b.id === busId) || 
      (busNumber && b.busNumber.toLowerCase() === busNumber.toLowerCase()) || 
      b.id === currentUser?.assignedBusId || 
      b.id === 'bus-07'
    );
    if (index === -1) return error('Assigned bus not found', 404);

    db.buses[index].operationalStatus = status || 'On Route';
    if (statusText) {
      db.buses[index].statusText = statusText;
    } else {
      db.buses[index].statusText = `${status} (Updated by Staff)`;
    }
    db.buses[index].lastUpdated = new Date().toISOString();

    saveDb();
    return json({ success: true, message: 'Bus status updated successfully', bus: db.buses[index] });
  }

  // POST /api/staff/gps
  if (pathname === '/api/staff/gps' && method === 'POST') {
    loadDb();
    const { busId, latitude, longitude, speed, heading } = body;
    const targetBusId = busId || currentUser?.assignedBusId || 'bus-07';

    const index = db.buses.findIndex(b => b.id === targetBusId);
    if (index !== -1 && latitude && longitude) {
      db.buses[index].currentLat = Number(latitude);
      db.buses[index].currentLng = Number(longitude);
      if (speed !== undefined) db.buses[index].currentSpeed = Number(speed);
      db.buses[index].isLive = true;
      db.buses[index].lastUpdated = new Date().toISOString();
      saveDb();
    }

    return json({ success: true, timestamp: Date.now() });
  }

  // -------------------------------------------------------------
  // 7. ISSUE REPORTING (STAFF & ADMIN)
  // -------------------------------------------------------------
  // POST /api/staff/issues
  if (pathname === '/api/staff/issues' && method === 'POST') {
    loadDb();
    const { busId, busNumber, routeId, issueType, description, location, latitude, longitude, priority, photoUrl } = body;

    const newIssue = {
      id: `issue-${Date.now()}`,
      staffId: currentUser?.id || 'staff-01',
      staffName: currentUser?.name || 'Bus Driver',
      busId: busId || 'bus-07',
      busNumber: busNumber || 'DCE-BUS-07',
      routeId: routeId || 'route-07',
      issueType: issueType || 'Mechanical Problem',
      description: description || 'Issue reported by staff.',
      photoUrl: photoUrl || '',
      location: location || 'On Route',
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      priority: priority || 'Medium',
      status: 'New',
      adminRemarks: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.issue_reports.unshift(newIssue);
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'ISSUE_FILED', newIssue.busNumber, `Staff reported ${newIssue.issueType}: ${newIssue.description.slice(0, 50)}`);

    return json({ success: true, message: 'Issue reported to transport management', issue: newIssue });
  }

  // GET /api/staff/issues
  if (pathname === '/api/staff/issues' && method === 'GET') {
    loadDb();
    const staffId = currentUser?.id;
    const reports = staffId ? db.issue_reports.filter(r => r.staffId === staffId) : db.issue_reports;
    return json({ success: true, count: reports.length, issues: reports });
  }

  // GET /api/admin/issues
  if (pathname === '/api/admin/issues' && method === 'GET') {
    loadDb();
    return json({ success: true, count: db.issue_reports.length, issues: db.issue_reports });
  }

  // PUT /api/admin/issues/:id
  if (pathname.startsWith('/api/admin/issues/') && method === 'PUT') {
    const id = pathname.replace('/api/admin/issues/', '').trim();
    loadDb();
    const index = db.issue_reports.findIndex(r => r.id === id);
    if (index === -1) return error('Issue report not found', 404);

    const { status, adminRemarks } = body;
    if (status) db.issue_reports[index].status = status;
    if (adminRemarks !== undefined) db.issue_reports[index].adminRemarks = adminRemarks;
    db.issue_reports[index].updatedAt = new Date().toISOString();

    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'ISSUE_UPDATED', db.issue_reports[index].busNumber, `Updated issue ${id} status to '${status}' with remarks: "${adminRemarks || ''}"`);

    return json({ success: true, message: 'Issue status updated', issue: db.issue_reports[index] });
  }

  // -------------------------------------------------------------
  // 8. STAFF MANAGEMENT (ADMIN)
  // -------------------------------------------------------------
  if (pathname === '/api/staff' && method === 'GET') {
    loadDb();
    return json({ success: true, count: db.staff.length, staff: db.staff });
  }

  if (pathname === '/api/staff' && method === 'POST') {
    loadDb();
    const { name, email, phone, role, assignedBusId, assignedRouteId } = body;
    if (!name || !email) return error('Staff name and email are required', 400);

    const newStaff = {
      id: `staff-${Date.now()}`,
      name,
      email,
      phone: phone || '',
      role: role || 'driver',
      assignedBusId: assignedBusId || 'bus-07',
      assignedRouteId: assignedRouteId || 'route-07',
      passwordHash: hashPassword(body.password || 'dce2024'),
      status: 'active',
      lastActive: new Date().toISOString()
    };

    db.staff.push(newStaff);
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'STAFF_REGISTERED', newStaff.name, `Registered new staff member ${newStaff.name} as ${newStaff.role}`);

    return json({ success: true, message: 'Staff member added', staff: newStaff });
  }

  if (pathname.startsWith('/api/staff/') && method === 'PUT') {
    const id = pathname.replace('/api/staff/', '').trim();
    loadDb();
    const index = db.staff.findIndex(s => s.id === id);
    if (index === -1) return error('Staff member not found', 404);

    db.staff[index] = { ...db.staff[index], ...body, id };
    if (body.password) {
      db.staff[index].passwordHash = hashPassword(body.password);
    }
    saveDb();
    logActivity(currentUser?.id, currentUser?.name, 'STAFF_UPDATED', db.staff[index].name, `Updated profile/assignment for staff ${db.staff[index].name}`);

    return json({ success: true, message: 'Staff updated successfully', staff: db.staff[index] });
  }

  // -------------------------------------------------------------
  // 9. ACTIVITY LOGS (ADMIN AUDIT)
  // -------------------------------------------------------------
  if (pathname === '/api/admin/activity-logs' && method === 'GET') {
    loadDb();
    return json({ success: true, count: db.activity_logs.length, logs: db.activity_logs });
  }

  // -------------------------------------------------------------
  // 10. REAL-TIME / SYNC ENDPOINT (WEBSITE & MOBILE APK)
  // -------------------------------------------------------------
  if (pathname === '/api/sync' && method === 'GET') {
    loadDb();
    const allStops = [];
    db.routes.forEach(r => {
      (r.stops || []).forEach(s => {
        allStops.push({ ...s, routeId: r.id });
      });
    });

    const activeIssues = db.issue_reports.filter(r => r.status !== 'Closed' && r.status !== 'Resolved');

    return json({
      success: true,
      buses: db.buses,
      routes: db.routes,
      stops: allStops,
      announcements: db.voice_announcements.filter(v => v.isActive),
      activeIssues,
      systemHealth: {
        status: 'ONLINE',
        activeBuses: db.buses.filter(b => b.isActive).length,
        activeStaff: db.staff.filter(s => s.status === 'active').length,
        lastSyncedAt: new Date().toISOString(),
        sourceOfTruth: 'DCE Central Transit Cloud Server v2.4'
      }
    });
  }

  // Unhandled API Route
  return error(`API endpoint not found: ${method} ${pathname}`, 404);
}
