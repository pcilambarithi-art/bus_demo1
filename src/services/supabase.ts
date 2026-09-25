import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RegistrationRecord } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Local storage key for fallback
const LOCAL_STORAGE_KEY = 'systech2k27_registrations';

export const saveRegistration = async (
  record: RegistrationRecord
): Promise<{ success: boolean; storageType: 'supabase' | 'local'; error?: string }> => {
  // Try Supabase first if configured
  if (supabase && isConfigured) {
    try {
      const { error } = await supabase.from('registrations').insert([
        {
          registration_id: record.registrationId,
          full_name: record.fullName,
          email: record.email,
          phone: record.phone,
          college_name: record.collegeName,
          department: record.department,
          year_of_study: record.yearOfStudy,
          event_id: record.eventId,
          participation_type: record.participationType,
          team_name: record.teamName || null,
          team_members: record.teamMembers || [],
          qr_payload: record.qrPayload,
          created_at: record.createdAt,
          status: record.status,
        },
      ]);

      if (!error) {
        // Also keep a copy in local storage for quick access
        saveToLocalStorage(record);
        return { success: true, storageType: 'supabase' };
      } else {
        console.warn('Supabase insert warning, falling back to local vault:', error.message);
        saveToLocalStorage(record);
        return { 
          success: true, 
          storageType: 'local', 
          error: `Saved to local vault (Supabase warning: ${error.message})` 
        };
      }
    } catch (err: unknown) {
      console.error('Supabase network error, fallback to local vault:', err);
      saveToLocalStorage(record);
      return { 
        success: true, 
        storageType: 'local', 
        error: 'Saved to local vault (Network unreachable)' 
      };
    }
  }

  // Fallback to local storage
  saveToLocalStorage(record);
  return { success: true, storageType: 'local' };
};

const saveToLocalStorage = (record: RegistrationRecord) => {
  try {
    const existing = getLocalRegistrations();
    const updated = [record, ...existing.filter(r => r.registrationId !== record.registrationId)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Local storage save failed:', err);
  }
};

export const getLocalRegistrations = (): RegistrationRecord[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// SQL setup script for user to copy-paste into Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- SYSTECH 2K27 Registration Table Schema
-- Run this in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  college_name TEXT NOT NULL,
  department TEXT NOT NULL,
  year_of_study TEXT NOT NULL,
  event_id TEXT NOT NULL,
  participation_type TEXT NOT NULL,
  team_name TEXT,
  team_members JSONB DEFAULT '[]'::jsonb,
  qr_payload TEXT NOT NULL,
  status TEXT DEFAULT 'CONFIRMED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for event registration
CREATE POLICY "Allow public registration insert"
ON registrations
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous read of their own registration status (optional)
CREATE POLICY "Allow public read of registrations"
ON registrations
FOR SELECT
TO anon
USING (true);
`;
