import { getDb, loadDb, saveDb } from '../database/database_service.mjs';
import { logActivity } from '../admin/admin_activity_logger.mjs';

export function handleCreateIssue(body, currentUser, { json }) {
  loadDb();
  const db = getDb();
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

export function handleGetStaffIssues(currentUser, { json }) {
  loadDb();
  const db = getDb();
  const staffId = currentUser?.id;
  const reports = staffId ? db.issue_reports.filter(r => r.staffId === staffId) : db.issue_reports;
  return json({ success: true, count: reports.length, issues: reports });
}
