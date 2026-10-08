import { getDb, loadDb } from '../database/database_service.mjs';

export function handleGetStaffProfile(currentUser, { json }) {
  loadDb();
  const db = getDb();
  let staffMember = null;
  if (currentUser && currentUser.role === 'staff') {
    staffMember = db.staff.find(s => s.id === currentUser.id);
  }
  if (!staffMember) {
    staffMember = db.staff[0];
  }

  const assignedBus = db.buses.find(b => b.id === staffMember.assignedBusId) || db.buses[0];
  const assignedRoute = db.routes.find(r => r.id === assignedBus.routeId) || db.routes[0];

  return json({
    success: true,
    staff: staffMember,
    bus: assignedBus,
    route: assignedRoute
  });
}
