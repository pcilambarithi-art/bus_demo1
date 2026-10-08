import { getDb, loadDb, saveDb } from '../database/database_service.mjs';
import { logActivity } from '../admin/admin_activity_logger.mjs';

export function handleGetRoutes({ json }) {
  loadDb();
  const db = getDb();
  return json({ success: true, count: db.routes.length, routes: db.routes });
}

export function handleCreateRoute(body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
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

export function handleUpdateRoute(id, body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
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
