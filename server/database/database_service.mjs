import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../db.json');

let db = null;

export function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
    } else {
      throw new Error('db.json not found');
    }
  } catch (err) {
    console.error('[Database] Error loading db.json:', err);
    if (!db) {
      db = {
        admins: [],
        staff: [],
        buses: [],
        routes: [],
        voice_announcements: [],
        issue_reports: [],
        activity_logs: []
      };
    }
  }
  return db;
}

export function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Error writing to db.json:', err);
  }
}

export function getDb() {
  if (!db) loadDb();
  return db;
}

// Initial load
loadDb();
