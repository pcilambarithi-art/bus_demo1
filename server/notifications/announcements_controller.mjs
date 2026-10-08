import { getDb, loadDb, saveDb } from '../database/database_service.mjs';
import { logActivity } from '../admin/admin_activity_logger.mjs';

export function handleGetAnnouncements({ json }) {
  loadDb();
  const db = getDb();
  return json({ success: true, count: db.voice_announcements.length, announcements: db.voice_announcements });
}

export function handleCreateAnnouncement(body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
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

export function handleUpdateAnnouncement(id, body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
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

export function handleDeleteAnnouncement(id, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
  const index = db.voice_announcements.findIndex(v => v.id === id);
  if (index === -1) return error('Announcement not found', 404);

  const removed = db.voice_announcements.splice(index, 1)[0];
  saveDb();
  logActivity(currentUser?.id, currentUser?.name, 'ANNOUNCEMENT_DELETED', removed.stopName, `Deleted announcement for ${removed.stopName}`);

  return json({ success: true, message: 'Announcement removed successfully' });
}
