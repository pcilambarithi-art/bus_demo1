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
}

export interface BusRoute {
  id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  totalDistanceKm: number;
  estimatedTotalMinutes: number;
  stops: BusStop[];
  waypoints: [number, number][]; // Lat, Lng polyline
}

export interface BusVehicle {
  id: string;
  busNumber: string;
  plateNumber: string;
  routeId: string;
  driverName: string;
  driverPhone: string;
  driverRating: number;
  driverPhoto?: string;
  busImage?: string;
  capacity: number;
  currentOccupancy: number;
  hasAC: boolean;
  isLive: boolean;
  statusText?: string;
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

export type VoiceAssistantId = 'leda' | 'puck' | 'charon' | 'aoede' | 'fenrir' | 'demodokos';

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

