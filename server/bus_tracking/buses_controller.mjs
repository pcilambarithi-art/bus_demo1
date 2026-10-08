import { getDb, loadDb, saveDb } from '../database/database_service.mjs';
import { logActivity } from '../admin/admin_activity_logger.mjs';

export function handleGetBuses({ json }) {
  loadDb();
  const db = getDb();
  return json({ success: true, count: db.buses.length, buses: db.buses });
}

export function handleCreateBus(body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
  const { busNumber, routeId, routeName, startingPoint, destination, assignedStaffId, driverName, driverPhone, capacity, hasAC, statusText, operationalStatus } = body;

  if (!busNumber) {
    return error('Bus number is required', 400);
  }

  const newId = body.id || `bus-${busNumber.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;
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

export function handleUpdateBus(id, body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
  const index = db.buses.findIndex(b => b.id === id);
  if (index === -1) {
    return error(`Bus with ID '${id}' not found`, 404);
  }

  const updated = {
    ...db.buses[index],
    ...body,
    id,
    lastUpdated: new Date().toISOString()
  };

  db.buses[index] = updated;
  saveDb();
  logActivity(currentUser?.id, currentUser?.name, 'BUS_UPDATED', updated.busNumber, `Modified specifications or status of bus ${updated.busNumber}`);

  return json({ success: true, message: 'Bus updated successfully', bus: updated });
}

export function handleDeleteBus(id, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
  const bus = db.buses.find(b => b.id === id);
  if (!bus) {
    return error(`Bus with ID '${id}' not found`, 404);
  }

  db.buses = db.buses.filter(b => b.id !== id);
  saveDb();
  logActivity(currentUser?.id, currentUser?.name, 'BUS_DELETED', bus.busNumber, `Deleted bus ${bus.busNumber} from active fleet`);

  return json({ success: true, message: `Bus ${bus.busNumber} removed successfully` });
}
