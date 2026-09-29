/**
 * DCE Transit — Centralized Bus API Client Service
 * Acts as the Single Source of Truth for both Web Application and Mobile APK.
 * Features automatic offline caching, background revalidation, instant cross-tab sync,
 * and resilient local-storage fallback for static hosts (e.g. GitHub Pages).
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
const STAFF_LIST_KEY = 'dce_staff_roster_v2';
const LOGS_KEY = 'dce_activity_logs_v2';

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

const DEFAULT_STAFF: StaffUser[] = [
  {
    id: 'staff-01',
    name: 'Muruganandam K.',
    email: 'murugan@dce.edu',
    phone: '+91 94440 12894',
    role: 'driver',
    assignedBusId: 'bus-07',
    assignedRouteId: 'route-07',
    status: 'active',
    lastActive: new Date().toISOString()
  },
  {
    id: 'staff-02',
    name: 'Senthil Kumar R.',
    email: 'senthil@dce.edu',
    phone: '+91 94442 77410',
    role: 'driver',
    assignedBusId: 'bus-04',
    assignedRouteId: 'route-04',
    status: 'active',
    lastActive: new Date().toISOString()
  },
  {
    id: 'staff-03',
    name: 'Paneerselvam M.',
    email: 'paneer@dce.edu',
    phone: '+91 98840 33190',
    role: 'driver',
    assignedBusId: 'bus-01',
    assignedRouteId: 'route-01',
    status: 'active',
    lastActive: new Date().toISOString()
  },
  {
    id: 'staff-04',
    name: 'Govindaraj V.',
    email: 'govind@dce.edu',
    phone: '+91 98412 88921',
    role: 'driver',
    assignedBusId: 'bus-12',
    assignedRouteId: 'route-12',
    status: 'active',
    lastActive: new Date().toISOString()
  }
];

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

  public getStoredStaffSession(): StaffUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('dce_staff_user') || sessionStorage.getItem('dce_staff_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------
  // HTTP Fetch Wrapper with HTML Detection & Safe JSON Handling
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
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      // Guard: If response is HTML (starts with '<' or non-JSON content-type), throw sentinel
      if (!contentType.includes('application/json') || text.trim().startsWith('<')) {
        throw new Error('SERVER_OFFLINE_OR_STATIC_HTML');
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('SERVER_OFFLINE_OR_STATIC_HTML');
      }

      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return data as T;
    } catch (err: any) {
      if (err.message !== 'SERVER_OFFLINE_OR_STATIC_HTML') {
        console.warn(`[API] Network or parsing issue for ${endpoint}:`, err.message);
      }
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
    } catch {
      // Offline or static HTML fallback (GitHub Pages)
    }

    if (!this.cachedPayload) {
      this.cachedPayload = this.loadFromLocalCache();
    }
    return this.cachedPayload;
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
    try {
      const res = await this.request<{ success: boolean; token: string; admin: AdminUser }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      this.setAdminSession(res.token, res.admin);
      return { token: res.token, admin: res.admin };
    } catch {
      // Local fallback for GitHub Pages and offline mode
      const cleanEmail = email.trim().toLowerCase();
      const validAdmin = (cleanEmail === 'admin@dce.edu' || cleanEmail === 'admin') &&
                         (password === 'admin123' || password === 'admin' || password === 'admin2k27');
      if (validAdmin) {
        const admin: AdminUser = {
          id: 'admin-01',
          email: 'admin@dce.edu',
          name: 'DCE Transport Administrator',
          role: 'admin',
          lastLogin: new Date().toISOString()
        };
        const token = `dce_admin_local_${Date.now()}`;
        this.setAdminSession(token, admin);
        this.logLocalActivity('ADMIN_LOGIN', 'Web Portal', 'Administrator logged into Web Admin Console (Local/Offline)');
        return { token, admin };
      }
      throw new Error('Invalid Administrator credentials. Please verify your email and password.');
    }
  }

  public async getBuses(): Promise<BusVehicle[]> {
    const sync = await this.fetchSync();
    return sync.buses;
  }

  public async addBus(busData: Partial<BusVehicle>): Promise<BusVehicle> {
    try {
      const res = await this.request<{ success: boolean; bus: BusVehicle }>('/api/buses', {
        method: 'POST',
        body: JSON.stringify(busData)
      });
      await this.fetchSync(true);
      return res.bus;
    } catch {
      const sync = this.getCachedSync();
      const newBus: BusVehicle = {
        id: busData.id || `bus-${Date.now()}`,
        busNumber: (busData.busNumber || 'DCE-BUS').toUpperCase(),
        plateNumber: busData.plateNumber || `TN-11-DCE-${Math.floor(1000 + Math.random() * 9000)}`,
        routeId: busData.routeId || 'route-07',
        routeName: busData.routeName || 'DCE Express',
        startingPoint: busData.startingPoint || 'Tambaram',
        destination: busData.destination || 'DCE Campus',
        assignedStaffId: busData.assignedStaffId || 'staff-01',
        driverName: busData.driverName || 'DCE Bus Driver',
        driverPhone: busData.driverPhone || '+91 94440 00000',
        driverRating: 4.8,
        capacity: Number(busData.capacity) || 50,
        currentOccupancy: Number(busData.currentOccupancy) || 0,
        hasAC: Boolean(busData.hasAC),
        isLive: true,
        operationalStatus: busData.operationalStatus || 'In Service',
        statusText: busData.statusText || 'In Service (Active)',
        isActive: true,
        currentLat: busData.currentLat || 12.9249,
        currentLng: busData.currentLng || 80.1165,
        currentSpeed: 0,
        lastUpdated: new Date().toISOString(),
        ...busData
      };

      const existingIdx = sync.buses.findIndex(b => b.id === newBus.id || b.busNumber === newBus.busNumber);
      if (existingIdx >= 0) {
        sync.buses[existingIdx] = { ...sync.buses[existingIdx], ...newBus };
      } else {
        sync.buses.push(newBus);
      }

      this.saveToLocalCache(sync);
      this.cachedPayload = sync;
      this.broadcastUpdate(sync);
      this.notifyListeners(sync);
      this.logLocalActivity('BUS_ADDED', newBus.busNumber, `Added new bus ${newBus.busNumber} (Local)`);
      return newBus;
    }
  }

  public async updateBus(id: string, busData: Partial<BusVehicle>): Promise<BusVehicle> {
    try {
      const res = await this.request<{ success: boolean; bus: BusVehicle }>(`/api/buses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(busData)
      });
      await this.fetchSync(true);
      return res.bus;
    } catch {
      const sync = this.getCachedSync();
      const idx = sync.buses.findIndex(b => b.id === id);
      if (idx !== -1) {
        sync.buses[idx] = {
          ...sync.buses[idx],
          ...busData,
          id,
          lastUpdated: new Date().toISOString()
        };
        this.saveToLocalCache(sync);
        this.cachedPayload = sync;
        this.broadcastUpdate(sync);
        this.notifyListeners(sync);
        this.logLocalActivity('BUS_UPDATED', sync.buses[idx].busNumber, `Updated bus ${sync.buses[idx].busNumber} (Local)`);
        return sync.buses[idx];
      }
      throw new Error(`Bus with ID '${id}' not found`);
    }
  }

  public async deleteBus(id: string): Promise<boolean> {
    try {
      await this.request<{ success: boolean }>(`/api/buses/${id}`, {
        method: 'DELETE'
      });
      await this.fetchSync(true);
      return true;
    } catch {
      const sync = this.getCachedSync();
      const bus = sync.buses.find(b => b.id === id);
      sync.buses = sync.buses.filter(b => b.id !== id);
      this.saveToLocalCache(sync);
      this.cachedPayload = sync;
      this.broadcastUpdate(sync);
      this.notifyListeners(sync);
      if (bus) {
        this.logLocalActivity('BUS_DELETED', bus.busNumber, `Deleted bus ${bus.busNumber} (Local)`);
      }
      return true;
    }
  }

  public async getRoutes(): Promise<BusRoute[]> {
    const sync = await this.fetchSync();
    return sync.routes;
  }

  public async addRoute(routeData: Partial<BusRoute>): Promise<BusRoute> {
    try {
      const res = await this.request<{ success: boolean; route: BusRoute }>('/api/routes', {
        method: 'POST',
        body: JSON.stringify(routeData)
      });
      await this.fetchSync(true);
      return res.route;
    } catch {
      const sync = this.getCachedSync();
      const newRoute: BusRoute = {
        id: routeData.id || `route-${Date.now()}`,
        name: routeData.name || 'New Route',
        code: routeData.code || `R-${sync.routes.length + 1}`,
        routeNumber: routeData.routeNumber || `${sync.routes.length + 1}`,
        origin: routeData.origin || 'Tambaram',
        destination: routeData.destination || 'DCE Campus, Manimangalam',
        startingPoint: routeData.origin || 'Tambaram',
        description: routeData.description || `Route ${routeData.name}`,
        totalDistanceKm: Number(routeData.totalDistanceKm) || 15.0,
        estimatedTotalMinutes: Number(routeData.estimatedTotalMinutes) || 35,
        stops: routeData.stops || [],
        waypoints: routeData.waypoints || [],
        ...routeData
      };
      sync.routes.push(newRoute);
      this.saveToLocalCache(sync);
      this.cachedPayload = sync;
      this.broadcastUpdate(sync);
      this.notifyListeners(sync);
      this.logLocalActivity('ROUTE_CREATED', newRoute.name, `Created route ${newRoute.name} (Local)`);
      return newRoute;
    }
  }

  public async updateRoute(id: string, routeData: Partial<BusRoute>): Promise<BusRoute> {
    try {
      const res = await this.request<{ success: boolean; route: BusRoute }>(`/api/routes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(routeData)
      });
      await this.fetchSync(true);
      return res.route;
    } catch {
      const sync = this.getCachedSync();
      const idx = sync.routes.findIndex(r => r.id === id);
      if (idx !== -1) {
        sync.routes[idx] = { ...sync.routes[idx], ...routeData, id };
        this.saveToLocalCache(sync);
        this.cachedPayload = sync;
        this.broadcastUpdate(sync);
        this.notifyListeners(sync);
        this.logLocalActivity('ROUTE_UPDATED', sync.routes[idx].name, `Updated route ${sync.routes[idx].name} (Local)`);
        return sync.routes[idx];
      }
      throw new Error(`Route with ID '${id}' not found`);
    }
  }

  public async getStops(): Promise<BusStop[]> {
    try {
      const res = await this.request<{ success: boolean; stops: BusStop[] }>('/api/stops');
      return res.stops || [];
    } catch {
      const sync = this.getCachedSync();
      return sync.stops || [];
    }
  }

  public async addStop(stopData: Partial<BusStop> & { routeId: string }): Promise<BusStop> {
    try {
      const res = await this.request<{ success: boolean; stop: BusStop }>('/api/stops', {
        method: 'POST',
        body: JSON.stringify(stopData)
      });
      await this.fetchSync(true);
      return res.stop;
    } catch {
      const sync = this.getCachedSync();
      const targetRoute = sync.routes.find(r => r.id === stopData.routeId) || sync.routes[0];
      const newStop: BusStop = {
        id: stopData.id || `stop-${Date.now()}`,
        name: stopData.name || 'New Bus Stop',
        shortName: stopData.shortName || (stopData.name ? stopData.name.split(' ')[0] : 'Stop'),
        lat: Number(stopData.lat),
        lng: Number(stopData.lng),
        sequence: Number(stopData.sequence) || ((targetRoute?.stops?.length || 0) + 1),
        scheduledTime: stopData.scheduledTime || '07:30 AM',
        studentsWaiting: Number(stopData.studentsWaiting) || 0,
        isTerminal: Boolean(stopData.isTerminal),
        routeId: targetRoute?.id || 'route-07',
        isActive: true
      };

      if (targetRoute) {
        targetRoute.stops.push(newStop);
        targetRoute.stops.sort((a, b) => a.sequence - b.sequence);
        targetRoute.waypoints.push([newStop.lat, newStop.lng]);
      }
      sync.stops.push(newStop);
      this.saveToLocalCache(sync);
      this.cachedPayload = sync;
      this.broadcastUpdate(sync);
      this.notifyListeners(sync);
      this.logLocalActivity('STOP_ADDED', newStop.name, `Added bus stop '${newStop.name}' (Local)`);
      return newStop;
    }
  }

  public async updateStop(id: string, stopData: Partial<BusStop>): Promise<BusStop> {
    try {
      const res = await this.request<{ success: boolean; stop: BusStop }>(`/api/stops/${id}`, {
        method: 'PUT',
        body: JSON.stringify(stopData)
      });
      await this.fetchSync(true);
      return res.stop;
    } catch {
      const sync = this.getCachedSync();
      let foundStop: BusStop | null = null;
      for (const r of sync.routes) {
        const idx = (r.stops || []).findIndex(s => s.id === id);
        if (idx !== -1) {
          r.stops[idx] = { ...r.stops[idx], ...stopData, id };
          foundStop = r.stops[idx];
          break;
        }
      }
      const sIdx = sync.stops.findIndex(s => s.id === id);
      if (sIdx !== -1) {
        sync.stops[sIdx] = { ...sync.stops[sIdx], ...stopData, id };
        if (!foundStop) foundStop = sync.stops[sIdx];
      }

      if (foundStop) {
        this.saveToLocalCache(sync);
        this.cachedPayload = sync;
        this.broadcastUpdate(sync);
        this.notifyListeners(sync);
        this.logLocalActivity('STOP_MODIFIED', foundStop.name, `Updated coordinates for '${foundStop.name}' (Local)`);
        return foundStop;
      }
      throw new Error(`Stop with ID '${id}' not found`);
    }
  }

  public async deleteStop(id: string): Promise<boolean> {
    try {
      await this.request<{ success: boolean }>(`/api/stops/${id}`, {
        method: 'DELETE'
      });
      await this.fetchSync(true);
      return true;
    } catch {
      const sync = this.getCachedSync();
      sync.routes.forEach(r => {
        r.stops = (r.stops || []).filter(s => s.id !== id);
      });
      sync.stops = sync.stops.filter(s => s.id !== id);
      this.saveToLocalCache(sync);
      this.cachedPayload = sync;
      this.broadcastUpdate(sync);
      this.notifyListeners(sync);
      this.logLocalActivity('STOP_DELETED', id, `Deleted stop ${id} (Local)`);
      return true;
    }
  }

  public async getAnnouncements(): Promise<VoiceAnnouncement[]> {
    try {
      const res = await this.request<{ success: boolean; announcements: VoiceAnnouncement[] }>('/api/announcements');
      return res.announcements || [];
    } catch {
      const sync = this.getCachedSync();
      return sync.announcements || [];
    }
  }

  public async addAnnouncement(data: Partial<VoiceAnnouncement>): Promise<VoiceAnnouncement> {
    try {
      const res = await this.request<{ success: boolean; announcement: VoiceAnnouncement }>('/api/announcements', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await this.fetchSync(true);
      return res.announcement;
    } catch {
      const sync = this.getCachedSync();
      const newAnnouncement: VoiceAnnouncement = {
        id: data.id || `va-${Date.now()}`,
        routeId: data.routeId || 'route-07',
        stopId: data.stopId || 'stop-07-3',
        stopName: data.stopName || 'Assigned Stop',
        text: data.text || 'Approaching stop.',
        textTamil: data.textTamil || '',
        language: data.language || 'en-IN',
        audioUrl: data.audioUrl || '',
        triggerDistanceMeters: Number(data.triggerDistanceMeters) || 300,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        createdAt: new Date().toISOString()
      };
      sync.announcements.push(newAnnouncement);
      this.saveToLocalCache(sync);
      this.cachedPayload = sync;
      this.broadcastUpdate(sync);
      this.notifyListeners(sync);
      this.logLocalActivity('ANNOUNCEMENT_ADDED', newAnnouncement.stopName, `Configured announcement for ${newAnnouncement.stopName} (Local)`);
      return newAnnouncement;
    }
  }

  public async updateAnnouncement(id: string, data: Partial<VoiceAnnouncement>): Promise<VoiceAnnouncement> {
    try {
      const res = await this.request<{ success: boolean; announcement: VoiceAnnouncement }>(`/api/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      await this.fetchSync(true);
      return res.announcement;
    } catch {
      const sync = this.getCachedSync();
      const idx = sync.announcements.findIndex(a => a.id === id);
      if (idx !== -1) {
        sync.announcements[idx] = { ...sync.announcements[idx], ...data, id };
        this.saveToLocalCache(sync);
        this.cachedPayload = sync;
        this.broadcastUpdate(sync);
        this.notifyListeners(sync);
        return sync.announcements[idx];
      }
      throw new Error(`Announcement with ID '${id}' not found`);
    }
  }

  public async deleteAnnouncement(id: string): Promise<boolean> {
    try {
      await this.request<{ success: boolean }>(`/api/announcements/${id}`, {
        method: 'DELETE'
      });
      await this.fetchSync(true);
      return true;
    } catch {
      const sync = this.getCachedSync();
      sync.announcements = sync.announcements.filter(a => a.id !== id);
      this.saveToLocalCache(sync);
      this.cachedPayload = sync;
      this.broadcastUpdate(sync);
      this.notifyListeners(sync);
      return true;
    }
  }

  public async getStaffList(): Promise<StaffUser[]> {
    try {
      const res = await this.request<{ success: boolean; staff: StaffUser[] }>('/api/staff');
      return res.staff || [];
    } catch {
      return this.getStoredStaffList();
    }
  }

  public async addStaff(data: Partial<StaffUser> & { password?: string }): Promise<StaffUser> {
    try {
      const res = await this.request<{ success: boolean; staff: StaffUser }>('/api/staff', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.staff;
    } catch {
      const list = this.getStoredStaffList();
      const newStaff: StaffUser = {
        id: data.id || `staff-${Date.now()}`,
        name: data.name || 'New Driver',
        email: data.email || 'driver@dce.edu',
        phone: data.phone || '+91 94440 00000',
        role: data.role || 'driver',
        assignedBusId: data.assignedBusId || 'bus-07',
        assignedRouteId: data.assignedRouteId || 'route-07',
        status: data.status || 'active',
        lastActive: new Date().toISOString()
      };
      list.push(newStaff);
      this.saveStoredStaffList(list);
      return newStaff;
    }
  }

  public async updateStaff(id: string, data: Partial<StaffUser>): Promise<StaffUser> {
    try {
      const res = await this.request<{ success: boolean; staff: StaffUser }>(`/api/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.staff;
    } catch {
      const list = this.getStoredStaffList();
      const idx = list.findIndex(s => s.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, id };
        this.saveStoredStaffList(list);
        return list[idx];
      }
      throw new Error(`Staff with ID '${id}' not found`);
    }
  }

  public async getAdminIssues(): Promise<StaffIssueReport[]> {
    try {
      const res = await this.request<{ success: boolean; issues: StaffIssueReport[] }>('/api/admin/issues');
      return res.issues || [];
    } catch {
      const sync = this.getCachedSync();
      return sync.activeIssues || [];
    }
  }

  public async updateIssueStatus(id: string, status: StaffIssueReport['status'], adminRemarks?: string): Promise<StaffIssueReport> {
    try {
      const res = await this.request<{ success: boolean; issue: StaffIssueReport }>(`/api/admin/issues/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminRemarks })
      });
      await this.fetchSync(true);
      return res.issue;
    } catch {
      const sync = this.getCachedSync();
      const idx = sync.activeIssues.findIndex(i => i.id === id);
      if (idx !== -1) {
        sync.activeIssues[idx].status = status;
        if (adminRemarks !== undefined) sync.activeIssues[idx].adminRemarks = adminRemarks;
        sync.activeIssues[idx].updatedAt = new Date().toISOString();
        this.saveToLocalCache(sync);
        this.cachedPayload = sync;
        this.broadcastUpdate(sync);
        this.notifyListeners(sync);
        return sync.activeIssues[idx];
      }
      throw new Error(`Issue with ID '${id}' not found`);
    }
  }

  public async getActivityLogs(): Promise<ActivityLog[]> {
    try {
      const res = await this.request<{ success: boolean; logs: ActivityLog[] }>('/api/admin/activity-logs');
      return res.logs || [];
    } catch {
      return this.getLocalActivityLogs();
    }
  }

  // -------------------------------------------------------------
  // Bus Staff Operations (Web Only)
  // -------------------------------------------------------------
  public async staffLogin(email: string, password: string): Promise<{ token: string; staff: StaffUser }> {
    try {
      const res = await this.request<{ success: boolean; token: string; staff: StaffUser }>('/api/staff/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      this.setStaffSession(res.token, res.staff);
      return { token: res.token, staff: res.staff };
    } catch {
      const clean = email.trim().toLowerCase();
      const staffList = this.getStoredStaffList();
      const staff = staffList.find(s => 
        s.email.toLowerCase() === clean || 
        (s.phone && s.phone.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, ''))
      ) || (clean.includes('staff') ? staffList[0] : null);

      if (staff && (password === 'dce2024' || password === 'staff123' || password === 'admin123')) {
        const token = `dce_staff_local_${Date.now()}`;
        this.setStaffSession(token, staff);
        return { token, staff };
      }
      throw new Error('Invalid Staff credentials. Please contact DCE Transport Desk.');
    }
  }

  public async getStaffProfile(): Promise<{ staff: StaffUser; bus: BusVehicle; route: BusRoute }> {
    try {
      return await this.request<{ success: boolean; staff: StaffUser; bus: BusVehicle; route: BusRoute }>('/api/staff/profile');
    } catch {
      const stored = this.getStoredStaffSession();
      const sync = this.getCachedSync();
      const staff = stored || this.getStoredStaffList()[0];
      const bus = sync.buses.find(b => b.id === staff.assignedBusId) || sync.buses[0];
      const route = sync.routes.find(r => r.id === bus.routeId) || sync.routes[0];
      return { staff, bus, route };
    }
  }

  public async updateBusStatus(busId: string, status: string, statusText?: string): Promise<BusVehicle> {
    try {
      const res = await this.request<{ success: boolean; bus: BusVehicle }>('/api/staff/bus-status', {
        method: 'PUT',
        body: JSON.stringify({ busId, status, statusText })
      });
      await this.fetchSync(true);
      return res.bus;
    } catch {
      const sync = this.getCachedSync();
      const idx = sync.buses.findIndex(b => b.id === busId || b.busNumber.toLowerCase() === busId.toLowerCase());
      if (idx !== -1) {
        sync.buses[idx].operationalStatus = status as any;
        sync.buses[idx].statusText = statusText || `${status} (Updated by Staff)`;
        sync.buses[idx].lastUpdated = new Date().toISOString();
        this.saveToLocalCache(sync);
        this.cachedPayload = sync;
        this.broadcastUpdate(sync);
        this.notifyListeners(sync);
        return sync.buses[idx];
      }
      throw new Error(`Bus with ID '${busId}' not found`);
    }
  }

  public async updateStaffGps(busId: string, coords: { latitude: number; longitude: number; speed?: number; heading?: number }): Promise<void> {
    try {
      await this.request<{ success: boolean }>('/api/staff/gps', {
        method: 'POST',
        body: JSON.stringify({ busId, ...coords })
      });
    } catch {
      const sync = this.getCachedSync();
      const idx = sync.buses.findIndex(b => b.id === busId || b.busNumber.toLowerCase() === busId.toLowerCase());
      if (idx !== -1) {
        sync.buses[idx].currentLat = coords.latitude;
        sync.buses[idx].currentLng = coords.longitude;
        if (coords.speed !== undefined) sync.buses[idx].currentSpeed = coords.speed;
        sync.buses[idx].isLive = true;
        sync.buses[idx].lastUpdated = new Date().toISOString();
        this.saveToLocalCache(sync);
        this.cachedPayload = sync;
        this.broadcastUpdate(sync);
        this.notifyListeners(sync);
      }
    }
  }

  public async reportIssue(issueData: Partial<StaffIssueReport>): Promise<StaffIssueReport> {
    try {
      const res = await this.request<{ success: boolean; issue: StaffIssueReport }>('/api/staff/issues', {
        method: 'POST',
        body: JSON.stringify(issueData)
      });
      await this.fetchSync(true);
      return res.issue;
    } catch {
      const sync = this.getCachedSync();
      const newIssue: StaffIssueReport = {
        id: `issue-${Date.now()}`,
        staffId: issueData.staffId || 'staff-01',
        staffName: issueData.staffName || 'Driver',
        busId: issueData.busId || 'bus-07',
        busNumber: issueData.busNumber || 'DCE-BUS-07',
        routeId: issueData.routeId || 'route-07',
        issueType: issueData.issueType || 'Mechanical Problem',
        description: issueData.description || 'Reported by staff',
        location: issueData.location || 'On Route',
        priority: issueData.priority || 'Medium',
        status: 'New',
        adminRemarks: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      sync.activeIssues = [newIssue, ...(sync.activeIssues || [])];
      this.saveToLocalCache(sync);
      this.cachedPayload = sync;
      this.broadcastUpdate(sync);
      this.notifyListeners(sync);
      return newIssue;
    }
  }

  public async getStaffIssues(): Promise<StaffIssueReport[]> {
    try {
      const res = await this.request<{ success: boolean; issues: StaffIssueReport[] }>('/api/staff/issues');
      return res.issues || [];
    } catch {
      const sync = this.getCachedSync();
      return sync.activeIssues || [];
    }
  }

  // -------------------------------------------------------------
  // Local Cache & Helpers
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

  public getStoredStaffList(): StaffUser[] {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STAFF_LIST_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch (_) {}
    }
    return [...DEFAULT_STAFF];
  }

  private saveStoredStaffList(list: StaffUser[]) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STAFF_LIST_KEY, JSON.stringify(list));
      } catch (_) {}
    }
  }

  private logLocalActivity(action: string, target: string, details: string) {
    if (typeof window === 'undefined') return;
    try {
      const logs = this.getLocalActivityLogs();
      logs.unshift({
        id: `log-${Date.now()}`,
        adminId: 'admin-01',
        adminName: 'DCE Transport Administrator',
        action,
        target,
        details,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch (_) {}
  }

  public getLocalActivityLogs(): ActivityLog[] {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
    }
    return [
      {
        id: 'log-01',
        adminId: 'admin-01',
        adminName: 'DCE Transport Administrator',
        action: 'SYSTEM_INIT',
        target: 'Fleet Sync',
        details: 'DCE Central Transit Single Source of Truth initialized',
        timestamp: new Date().toISOString()
      }
    ];
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
