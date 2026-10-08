import { getDb, saveDb } from '../database/database_service.mjs';

export function logActivity(adminId, adminName, action, target, details) {
  const db = getDb();
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
  if (db.activity_logs.length > 200) {
    db.activity_logs = db.activity_logs.slice(0, 200);
  }
  saveDb();
}

export function handleGetActivityLogs(req, res, { json }) {
  const db = getDb();
  return json({ success: true, count: db.activity_logs.length, logs: db.activity_logs });
}
