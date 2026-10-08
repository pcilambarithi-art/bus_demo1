import { getDb, loadDb } from '../database/database_service.mjs';
import { getAllLiveBuses, getNotificationHistory } from '../bus_tracking/live_telemetry_engine.mjs';

export function handleSync({ json }) {
  loadDb();
  const db = getDb();
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
    liveTelemetry: getAllLiveBuses(),
    notificationHistory: getNotificationHistory(),
    announcements: db.voice_announcements.filter(v => v.isActive),
    activeIssues,
    systemHealth: {
      status: 'ONLINE',
      activeBuses: db.buses.filter(b => b.isActive).length,
      activeStaff: db.staff.filter(s => s.status === 'active').length,
      lastSyncedAt: new Date().toISOString(),
      sourceOfTruth: 'DCE Central Transit Cloud Server v2.4 (Live GPS Engine)'
    }
  });
}
