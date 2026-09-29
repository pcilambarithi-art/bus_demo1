/**
 * DCE Transit — Centralized Bus API Client Service
 * Acts as the Single Source of Truth for both Web Application and Mobile APK.
 * Features automatic offline caching, background revalidation, and instant cross-tab sync.
 */

import type {
  BusVehicle,
  BusRoute,
  BusStop,
  VoiceAnnouncement,
  StaffIssueReport,
  ActivityLog,
  AdminUser,
  StaffUser,
  SyncPayload
} from '../types/bus';
import { BUS_ROUTES, BUS_VEHICLES } from '../data/busRoutes';

const CACHE_KEY_SYNC = 'dce_transit_cache_sync_v2';
const TOKEN_KEY_ADMIN = 'dce_admin_session_token';
const TOKEN_KEY_STAFF = 'dce_staff_session_token';
const CHANNEL_NAME = 'dce_transit_fleet_sync_broadcast';

// Optional custom API base URL for remote deployments or Android emulator (e.g. 10.0.2.2 or production domain)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// BroadcastChannel for instant zero-latency multi-tab synchronization
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn('[API Service] BroadcastChannel not supported:', e);
  }
}

type SyncListener = (payload: SyncPayload) => void;
const syncListeners: Set<SyncListener> = new Set();

class BusApiService {
  private cachedPayload: SyncPayload | null = null;
  private pollIntervalId: any = null;

  constructor() {
    this.cachedPayload = this.loadFromLocalCache();

    // Listen for broadcast messages from other tabs
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'FLEET_SYNC_UPDATE' && event.data?.payload) {
          this.cachedPayload = event.data.payload;
          this.notifyListeners(this.cachedPayload!);
        }
      };
    }
  }

  // -------------------------------------------------------------
  // Token & Session Management
  // -------------------------------------------------------------
  public getAdminToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY_ADMIN) || localStorage.getItem(TOKEN_KEY_ADMIN);
  }

  public setAdminSession(token: string, admin: AdminUser, remember: boolean = false) {
    if (typeof window === 'undefined') return;
    if (remember) {
      localStorage.setItem(TOKEN_KEY_ADMIN, token);
      localStorage.setItem('dce_admin_user', JSON.stringify(admin));
    } else {
      sessionStorage.setItem(TOKEN_KEY_ADMIN, token);
      sessionStorage.setItem('dce_admin_user', JSON.stringify(admin));
    }
  }

  public clearAdminSession() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(TOKEN_KEY_ADMIN);
    sessionStorage.removeItem('dce_admin_user');
    localStorage.removeItem(TOKEN_KEY_ADMIN);
    localStorage.removeItem('dce_admin_user');
  }

  public getStaffToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY_STAFF) || sessionStorage.getItem(TOKEN_KEY_STAFF);
  }

  public setStaffSession(token: string, staff: StaffUser) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY_STAFF, token);
    localStorage.setItem('dce_staff_user', JSON.stringify(staff));
  }

  public clearStaffSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY_STAFF);
    localStorage.removeItem('dce_staff_user');
    sessionStorage.removeItem(TOKEN_KEY_STAFF);
    sessionStorage.removeItem('dce_staff_user');
  }

  // -------------------------------------------------------------
  // HTTP Fetch Wrapper with Authentication & Error Handling
  // -------------------------------------------------------------
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    const adminToken = this.getAdminToken();
    const staffToken = this.getStaffToken();
    if (adminToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    } else if (staffToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${staffToken}`;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return data as T;
    } catch (err: any) {
      console.warn(`[API] Request failed for ${endpoint}:`, err.message);
      throw err;
    }
  }

  // -------------------------------------------------------------
  // Central Synchronization (The Single Source of Truth)
  // -------------------------------------------------------------
  public async fetchSync(forceFresh: boolean = false): Promise<SyncPayload> {
    try {
      const endpoint = forceFresh ? `/api/sync?_t=${Date.now()}` : '/api/sync';
      const data = await this.request<{ success: boolean } & SyncPayload>(endpoint);
      if (data && data.buses && data.routes) {
        const payload: SyncPayload = {
          buses: data.buses,
          routes: data.routes,
          stops: data.stops || [],
          announcements: data.announcements || [],
          activeIssues: data.activeIssues || [],
          systemHealth: data.systemHealth || {
            status: 'ONLINE',
            activeBuses: data.buses.length,
            activeStaff: 4,
            lastSyncedAt: new Date().toISOString(),
            sourceOfTruth: 'DCE Central Transit Cloud Server'
          }
        };

        this.cachedPayload = payload;
        this.saveToLocalCache(payload);
        this.broadcastUpdate(payload);
        this.notifyListeners(payload);
        return payload;
      }
    } catch (err) {
      console.info('[API] Offline or API unreachable, using cached fleet data.');
    }

    if (this.cachedPayload) {
      return this.cachedPayload;
    }

    // Default Seed Fallback
    const fallback = this.getFallbackSeed();
    this.cachedPayload = fallback;
    return fallback;
  }

  public getCachedSync(): SyncPayload {
    if (this.cachedPayload) return this.cachedPayload;
    return this.loadFromLocalCache();
  }

  public subscribeSync(listener: SyncListener): () => void {
    syncListeners.add(listener);
    if (this.cachedPayload) {
      listener(this.cachedPayload);
    }
    return () => {
      syncListeners.delete(listener);
    };
  }

  private notifyListeners(payload: SyncPayload) {
    syncListeners.forEach(listener => {
      try {
        listener(payload);
      } catch (e) {
        console.error('[API Service] Sync listener error:', e);
      }
    });
  }

  private broadcastUpdate(payload: SyncPayload) {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'FLEET_SYNC_UPDATE', payload });
      } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dce_transit_sync_event', { detail: payload }));
    }
  }

  public startPeriodicPolling(intervalMs: number = 4000) {
    if (this.pollIntervalId) return;
    this.pollIntervalId = setInterval(() => {
      this.fetchSync().catch(() => {});
    }, intervalMs);
  }

  public stopPeriodicPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  // -------------------------------------------------------------
  // Admin Operations (Web Only)
  // -------------------------------------------------------------
  public async adminLogin(email: string, password: string): Promise<{ token: string; admin: AdminUser }> {
    const res = await this.request<{ success: boolean; token: string; admin: AdminUser }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setAdminSession(res.token, res.admin);
    return { token: res.token, admin: res.admin };
  }

  public async getBuses(): Promise<BusVehicle[]> {
    const sync = await this.fetchSync();
    return sync.buses;
  }

  public async addBus(busData: Partial<BusVehicle>): Promise<BusVehicle> {
    const res = await this.request<{ success: boolean; bus: BusVehicle }>('/api/buses', {
      method: 'POST',
      body: JSON.stringify(busData)
    });
    await this.fetchSync(true);
    return res.bus;
  }

  public async updateBus(id: string, busData: Partial<BusVehicle>): Promise<BusVehicle> {
    const res = await this.request<{ success: boolean; bus: BusVehicle }>(`/api/buses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(busData)
    });
    await this.fetchSync(true);
    return res.bus;
  }

  public async deleteBus(id: string): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/buses/${id}`, {
      method: 'DELETE'
    });
    await this.fetchSync(true);
    return true;
  }

  public async getRoutes(): Promise<BusRoute[]> {
    const sync = await this.fetchSync();
    return sync.routes;
  }

  public async addRoute(routeData: Partial<BusRoute>): Promise<BusRoute> {
    const res = await this.request<{ success: boolean; route: BusRoute }>('/api/routes', {
      method: 'POST',
      body: JSON.stringify(routeData)
    });
    await this.fetchSync(true);
    return res.route;
  }

  public async updateRoute(id: string, routeData: Partial<BusRoute>): Promise<BusRoute> {
    const res = await this.request<{ success: boolean; route: BusRoute }>(`/api/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(routeData)
    });
    await this.fetchSync(true);
    return res.route;
  }

  public async getStops(): Promise<BusStop[]> {
    const res = await this.request<{ success: boolean; stops: BusStop[] }>('/api/stops');
    return res.stops || [];
  }

  public async addStop(stopData: Partial<BusStop> & { routeId: string }): Promise<BusStop> {
    const res = await this.request<{ success: boolean; stop: BusStop }>('/api/stops', {
      method: 'POST',
      body: JSON.stringify(stopData)
    });
    await this.fetchSync(true);
    return res.stop;
  }

  public async updateStop(id: string, stopData: Partial<BusStop>): Promise<BusStop> {
    const res = await this.request<{ success: boolean; stop: BusStop }>(`/api/stops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stopData)
    });
    await this.fetchSync(true);
    return res.stop;
  }

  public async deleteStop(id: string): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/stops/${id}`, {
      method: 'DELETE'
    });
    await this.fetchSync(true);
    return true;
  }

  public async getAnnouncements(): Promise<VoiceAnnouncement[]> {
    const res = await this.request<{ success: boolean; announcements: VoiceAnnouncement[] }>('/api/announcements');
    return res.announcements || [];
  }

  public async addAnnouncement(data: Partial<VoiceAnnouncement>): Promise<VoiceAnnouncement> {
    const res = await this.request<{ success: boolean; announcement: VoiceAnnouncement }>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await this.fetchSync(true);
    return res.announcement;
  }

  public async updateAnnouncement(id: string, data: Partial<VoiceAnnouncement>): Promise<VoiceAnnouncement> {
    const res = await this.request<{ success: boolean; announcement: VoiceAnnouncement }>(`/api/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    await this.fetchSync(true);
    return res.announcement;
  }

  public async deleteAnnouncement(id: string): Promise<boolean> {
    await this.request<{ success: boolean }>(`/api/announcements/${id}`, {
      method: 'DELETE'
    });
    await this.fetchSync(true);
    return true;
  }

  public async getStaffList(): Promise<StaffUser[]> {
    const res = await this.request<{ success: boolean; staff: StaffUser[] }>('/api/staff');
    return res.staff || [];
  }

  public async addStaff(data: Partial<StaffUser> & { password?: string }): Promise<StaffUser> {
    const res = await this.request<{ success: boolean; staff: StaffUser }>('/api/staff', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.staff;
  }

  public async updateStaff(id: string, data: Partial<StaffUser>): Promise<StaffUser> {
    const res = await this.request<{ success: boolean; staff: StaffUser }>(`/api/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.staff;
  }

  public async getAdminIssues(): Promise<StaffIssueReport[]> {
    const res = await this.request<{ success: boolean; issues: StaffIssueReport[] }>('/api/admin/issues');
    return res.issues || [];
  }

  public async updateIssueStatus(id: string, status: StaffIssueReport['status'], adminRemarks?: string): Promise<StaffIssueReport> {
    const res = await this.request<{ success: boolean; issue: StaffIssueReport }>(`/api/admin/issues/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminRemarks })
    });
    await this.fetchSync(true);
    return res.issue;
  }

  public async getActivityLogs(): Promise<ActivityLog[]> {
    const res = await this.request<{ success: boolean; logs: ActivityLog[] }>('/api/admin/activity-logs');
    return res.logs || [];
  }

  // -------------------------------------------------------------
  // Bus Staff Operations (Web Only)
  // -------------------------------------------------------------
  public async staffLogin(email: string, password: string): Promise<{ token: string; staff: StaffUser }> {
    const res = await this.request<{ success: boolean; token: string; staff: StaffUser }>('/api/staff/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setStaffSession(res.token, res.staff);
    return { token: res.token, staff: res.staff };
  }

  public async getStaffProfile(): Promise<{ staff: StaffUser; bus: BusVehicle; route: BusRoute }> {
    return this.request<{ success: boolean; staff: StaffUser; bus: BusVehicle; route: BusRoute }>('/api/staff/profile');
  }

  public async updateBusStatus(busId: string, status: string, statusText?: string): Promise<BusVehicle> {
    const res = await this.request<{ success: boolean; bus: BusVehicle }>('/api/staff/bus-status', {
      method: 'PUT',
      body: JSON.stringify({ busId, status, statusText })
    });
    await this.fetchSync(true);
    return res.bus;
  }

  public async updateStaffGps(busId: string, coords: { latitude: number; longitude: number; speed?: number; heading?: number }): Promise<void> {
    await this.request<{ success: boolean }>('/api/staff/gps', {
      method: 'POST',
      body: JSON.stringify({ busId, ...coords })
    });
  }

  public async reportIssue(issueData: Partial<StaffIssueReport>): Promise<StaffIssueReport> {
    const res = await this.request<{ success: boolean; issue: StaffIssueReport }>('/api/staff/issues', {
      method: 'POST',
      body: JSON.stringify(issueData)
    });
    await this.fetchSync(true);
    return res.issue;
  }

  public async getStaffIssues(): Promise<StaffIssueReport[]> {
    const res = await this.request<{ success: boolean; issues: StaffIssueReport[] }>('/api/staff/issues');
    return res.issues || [];
  }

  // -------------------------------------------------------------
  // Local Cache Persistence
  // -------------------------------------------------------------
  private loadFromLocalCache(): SyncPayload {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CACHE_KEY_SYNC);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.buses?.length && parsed?.routes?.length) {
            return parsed;
          }
        }
      } catch (_) {}
    }
    return this.getFallbackSeed();
  }

  private saveToLocalCache(payload: SyncPayload) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY_SYNC, JSON.stringify(payload));
      } catch (_) {}
    }
  }

  private getFallbackSeed(): SyncPayload {
    const allStops: BusStop[] = [];
    BUS_ROUTES.forEach(r => {
      r.stops.forEach(s => {
        allStops.push({ ...s, routeId: r.id });
      });
    });

    return {
      buses: BUS_VEHICLES,
      routes: BUS_ROUTES,
      stops: allStops,
      announcements: [
        {
          id: 'va-01',
          routeId: 'route-07',
          stopId: 'stop-07-3',
          stopName: 'Tambaram West Stand',
          text: 'Attention passengers, the next stop is Tambaram West Stand. Please prepare to alight.',
          textTamil: 'கவனிக்கவும், அடுத்த நிறுத்தம் தாம்பரம் மேற்கு பேருந்து நிலையம்.',
          language: 'en-IN',
          isActive: true
        }
      ],
      activeIssues: [],
      systemHealth: {
        status: 'ONLINE',
        activeBuses: BUS_VEHICLES.length,
        activeStaff: 4,
        lastSyncedAt: new Date().toISOString(),
        sourceOfTruth: 'DCE Local Offline Snapshot'
      }
    };
  }
}

export const busApiService = new BusApiService();
