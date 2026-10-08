import { getDb, loadDb, saveDb } from '../database/database_service.mjs';

export function handleUpdateBusStatus(body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
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

export function handleUpdateGps(body, currentUser, { json }) {
  loadDb();
  const db = getDb();
  const { busId, latitude, longitude, speed } = body;
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
