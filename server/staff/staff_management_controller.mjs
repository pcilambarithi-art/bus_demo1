import { getDb, loadDb, saveDb } from '../database/database_service.mjs';
import { hashPassword } from '../security/password_hasher.mjs';
import { logActivity } from '../admin/admin_activity_logger.mjs';

export function handleGetStaff({ json }) {
  loadDb();
  const db = getDb();
  return json({ success: true, count: db.staff.length, staff: db.staff });
}

export function handleCreateStaff(body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
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

export function handleUpdateStaff(id, body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
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
