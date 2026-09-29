export interface BusStop {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  sequence: number;
  scheduledTime: string;
  studentsWaiting: number;
  isTerminal?: boolean;
  routeId?: string;
  isActive?: boolean;
}

export interface BusRoute {
  id: string;
  name: string;
  code: string;
  routeNumber?: string;
  origin: string;
  destination: string;
  startingPoint?: string;
  description?: string;
  totalDistanceKm: number;
  estimatedTotalMinutes: number;
  stops: BusStop[];
  waypoints: [number, number][]; // Lat, Lng polyline
  assignedBusIds?: string[];
}

export interface BusVehicle {
  id: string;
  busNumber: string;
  plateNumber: string;
  routeId: string;
  routeName?: string;
  driverName: string;
  driverPhone: string;
  driverRating: number;
  busImage?: string;
  capacity: number;
  currentOccupancy: number;
  hasAC: boolean;
  isLive: boolean;
  statusText?: string;
  operationalStatus?: 'In Service' | 'On Route' | 'Delayed' | 'Breakdown' | 'Maintenance' | 'Out of Service' | 'Trip Started' | 'Trip Completed' | 'Stopped' | 'Emergency' | 'Ready' | 'Not Started';
  startingPoint?: string;
  destination?: string;
  assignedStaffId?: string;
  isActive?: boolean;
  currentLat?: number;
  currentLng?: number;
  currentSpeed?: number;
  lastUpdated?: string;
}

export type BusMovementStatus = 'LIVE' | 'APPROACHING' | 'ARRIVING' | 'ARRIVED' | 'OFFLINE';
export type GpsStatus = 'active' | 'improving' | 'disabled';
export type ConnectionStatus = 'live' | 'reconnecting' | 'offline';
export type ThemeMode = 'system' | 'light' | 'dark';
export type ActiveTab = 'home' | 'live' | 'route' | 'profile';
export type LocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

export interface BusTelemetry {
  lat: number;
  lng: number;
  bearing: number;
  speedKmh: number;
  currentWaypointIndex: number;
  currentStopIndex: number;
  nextStop: BusStop;
  distanceToNextStopMeters: number;
  distanceToStudentStopMeters: number;
  distanceToStudentMeters?: number;
  etaMinutes: number;
  status: BusMovementStatus;
  lastUpdated: string;
}

export interface ProximityAlert {
  id: string;
  tier: '1km' | '500m' | '200m' | 'arrived' | 'stop-approaching' | 'stop-arrived';
  busNumber?: string;
  stopName?: string;
  distanceKm?: number;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface StudentUser {
  name: string;
  id: string;
  rollNo?: string;
  department: string;
  semester: string;
  assignedBusId: string;
  assignedStopId: string;
  lat: number;
  lng: number;
  email?: string;
  avatarUrl?: string;
  authProvider?: 'google' | 'college' | 'guest';
}

export type VoiceSpeed = 0.9 | 0.95 | 1 | 1.5 | 2;

export type VoiceAssistantId = 'demodokos' | 'leda' | 'charon';

export interface VoiceAssistantProfile {
  id: VoiceAssistantId;
  name: string;
  tag: string;
  gender: 'Female' | 'Male' | 'Neutral';
  description: string;
  geminiVoice: string;
  pitch: number;
  sampleText: string;
}

// -------------------------------------------------------------
// Admin & Bus Staff Management Models
// -------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  lastLogin?: string;
  token?: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'driver' | 'conductor' | 'supervisor';
  assignedBusId: string;
  assignedRouteId?: string;
  status: 'active' | 'inactive';
  lastActive?: string;
  token?: string;
}

export type StaffIssueType =
  | 'Bus Breakdown'
  | 'Engine Problem'
  | 'Tyre Problem'
  | 'Accident'
  | 'Traffic Delay'
  | 'Route Problem'
  | 'GPS Problem'
  | 'Mechanical Problem'
  | 'Other';

export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type IssueStatus = 'New' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Closed';

export interface StaffIssueReport {
  id: string;
  staffId: string;
  staffName: string;
  busId: string;
  busNumber: string;
  routeId: string;
  issueType: StaffIssueType;
  description: string;
  photoUrl?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  priority: IssuePriority;
  status: IssueStatus;
  adminRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceAnnouncement {
  id: string;
  routeId: string;
  stopId: string;
  stopName: string;
  text: string;
  textTamil?: string;
  language: 'en-IN' | 'ta-IN';
  audioUrl?: string;
  triggerDistanceMeters?: number;
  isActive: boolean;
  createdAt?: string;
}

export interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

export interface SyncPayload {
  buses: BusVehicle[];
  routes: BusRoute[];
  stops: BusStop[];
  announcements: VoiceAnnouncement[];
  activeIssues: StaffIssueReport[];
  systemHealth: {
    status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
    activeBuses: number;
    activeStaff: number;
    lastSyncedAt: string;
    sourceOfTruth: string;
  };
}
