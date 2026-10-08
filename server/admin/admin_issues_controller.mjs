import { getDb, loadDb, saveDb } from '../database/database_service.mjs';
import { logActivity } from './admin_activity_logger.mjs';

export function handleGetAdminIssues({ json }) {
  loadDb();
  const db = getDb();
  return json({ success: true, count: db.issue_reports.length, issues: db.issue_reports });
}

export function handleUpdateIssue(id, body, currentUser, { json, error }) {
  loadDb();
  const db = getDb();
  const index = db.issue_reports.findIndex(r => r.id === id);
  if (index === -1) return error('Issue report not found', 404);

  const { status, adminRemarks } = body;
  if (status) db.issue_reports[index].status = status;
  if (adminRemarks !== undefined) db.issue_reports[index].adminRemarks = adminRemarks;
  db.issue_reports[index].updatedAt = new Date().toISOString();

  saveDb();
  logActivity(currentUser?.id, currentUser?.name, 'ISSUE_UPDATED', db.issue_reports[index].busNumber, `Updated issue ${id} status to '${status}' with remarks: "${adminRemarks || ''}"`);

  return json({ success: true, message: 'Issue status updated', issue: db.issue_reports[index] });
}
