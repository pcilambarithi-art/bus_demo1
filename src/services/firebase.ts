import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, type Database, type Unsubscribe } from 'firebase/database';

export interface DriverGpsPayload {
  busNumber: string;
  latitude: number;
  longitude: number;
  speed: number; // in km/h
  heading: number; // in degrees
  accuracy: number; // in meters
  timestamp: number;
  status: 'LIVE' | 'WAITING' | 'OFFLINE';
  driverName?: string;
  routeId?: string;
}

// Read configuration from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let db: Database | null = null;

const isConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.databaseURL &&
  !firebaseConfig.apiKey.includes('YOUR_')
);

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getDatabase(app);
    console.log('[Firebase RTDB] Connected to Realtime Database:', firebaseConfig.databaseURL);
  } catch (err) {
    console.warn('[Firebase RTDB] Initialization warning:', err);
  }
}

export { db };
export const isFirebaseConfigured = () => isConfigured && db !== null;

// Local cross-tab broadcast channel for local testing without cloud credentials
const localBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('dce_bus_gps_channel')
  : null;

/**
 * Publish real-time GPS coordinates from Driver Mode
 */
export async function publishDriverGps(busNumber: string, payload: DriverGpsPayload): Promise<boolean> {
  // Always notify local tabs immediately
  if (localBroadcast) {
    try {
      localBroadcast.postMessage({ busNumber, payload });
    } catch {
      // Ignore broadcast errors
    }
  }

  // Also publish to localStorage as fallback
  try {
    localStorage.setItem(`dce_live_bus_${busNumber}`, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }

  // If Firebase is configured, write directly to Realtime Database
  if (db) {
    try {
      const busRef = ref(db, `buses/${busNumber}`);
      await set(busRef, payload);
      return true;
    } catch (error) {
      console.error('[Firebase RTDB] Failed to push GPS data:', error);
      return false;
    }
  }

  return true;
}

/**
 * Subscribe to real-time bus telemetry updates
 */
export function subscribeBusGps(
  busNumber: string,
  onUpdate: (data: DriverGpsPayload) => void
): Unsubscribe {
  let unsubFirebase: Unsubscribe | null = null;

  // 1. Firebase subscription
  if (db) {
    try {
      const busRef = ref(db, `buses/${busNumber}`);
      unsubFirebase = onValue(busRef, (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val.latitude === 'number' && typeof val.longitude === 'number') {
          onUpdate(val as DriverGpsPayload);
        }
      });
    } catch (err) {
      console.warn('[Firebase RTDB] Subscription error:', err);
    }
  }

  // 2. Cross-tab BroadcastChannel subscription
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.busNumber === busNumber && event.data?.payload) {
      onUpdate(event.data.payload);
    }
  };

  if (localBroadcast) {
    localBroadcast.addEventListener('message', handleBroadcast);
  }

  // 3. LocalStorage storage event subscription
  const handleStorage = (event: StorageEvent) => {
    if (event.key === `dce_live_bus_${busNumber}` && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed && typeof parsed.latitude === 'number') {
          onUpdate(parsed);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  // Return composite unsubscribe
  return () => {
    if (unsubFirebase) unsubFirebase();
    if (localBroadcast) localBroadcast.removeEventListener('message', handleBroadcast);
    window.removeEventListener('storage', handleStorage);
  };
}
