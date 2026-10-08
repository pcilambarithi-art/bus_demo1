import { getDb, loadDb, saveDb } from '../database/database_service.mjs';
import { logActivity } from '../admin/admin_activity_logger.mjs';

export function handleGetStops({ json }) {
  loadDb();
  const db = getDb();
  const allStops = [];
  db.routes.forEach(r => {
    (r.stops || []).forEach(s => {
      allStops.push({ ...s, routeId: r.id, routeName: r.name });
    });
  });
  return json({ success: true, count: allStops.length, stops: allStops });
}

export function handleCreateStop(body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
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
  targetRoute.stops.sort((a, b) => a.sequence - b.sequence);
  targetRoute.waypoints.push([newStop.lat, newStop.lng]);

  saveDb();
  logActivity(currentUser?.id, currentUser?.name, 'STOP_ADDED', newStop.name, `Added bus stop '${newStop.name}' at [${newStop.lat.toFixed(4)}, ${newStop.lng.toFixed(4)}] on route ${targetRoute.name}`);

  return json({ success: true, message: 'Stop added successfully', stop: newStop, route: targetRoute });
}

export function handleUpdateStop(id, body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
  let foundStop = null;

  for (const r of db.routes) {
    const idx = (r.stops || []).findIndex(s => s.id === id);
    if (idx !== -1) {
      r.stops[idx] = { ...r.stops[idx], ...body, id };
      foundStop = r.stops[idx];
      break;
    }
  }

  if (!foundStop) return error(`Stop with ID '${id}' not found`, 404);

  saveDb();
  logActivity(currentUser?.id, currentUser?.name, 'STOP_MODIFIED', foundStop.name, `Updated location coordinates or sequence for stop '${foundStop.name}'`);

  return json({ success: true, message: 'Stop updated successfully', stop: foundStop });
}

export function handleDeleteStop(id, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
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
