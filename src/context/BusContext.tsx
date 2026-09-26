import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type {
  BusRoute,
  BusVehicle,
  BusTelemetry,
  StudentUser,
  ProximityAlert,
  GpsStatus,
  ConnectionStatus,
  ThemeMode,
  ActiveTab,
  BusMovementStatus,
  LocationPermissionState,
  VoiceAssistantId,
  VoiceSpeed,
} from '../types/bus';
import { BUS_ROUTES, BUS_VEHICLES, DEFAULT_STUDENT } from '../data/busRoutes';
import { calculateDistanceMeters, calculateBearing } from '../utils/geo';
import { sound } from '../utils/sound';
import { subscribeBusGps, type DriverGpsPayload } from '../services/firebase';
import { gracefulVoice } from '../services/speechSynthesis';
import {
  checkLocationPermission,
  requestLocationAccess,
  watchUserLocation,
  type GpsCoordinates,
} from '../services/location';

interface BusContextType {
  // Navigation & Tab
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;

  // Sound & Voice
  isSoundMuted: boolean;
  toggleSound: () => void;
  isGracefulVoiceEnabled: boolean;
  toggleGracefulVoice: () => void;
  voiceAssistantId: VoiceAssistantId;
  setVoiceAssistantId: (id: VoiceAssistantId) => void;
  voiceSpeed: VoiceSpeed;
  setVoiceSpeed: (speed: VoiceSpeed) => void;
  testGracefulVoice: (voiceId?: VoiceAssistantId, speed?: VoiceSpeed) => void;

  // Route & Vehicles
  allRoutes: BusRoute[];
  allBuses: BusVehicle[];
  selectedRoute: BusRoute;
  selectedBus: BusVehicle;
  selectBus: (busId: string) => void;
  selectRoute: (routeId: string) => void;

  // Student Info
  student: StudentUser;
  studentStop: BusRoute['stops'][0];
  updateStudentStop: (stopId: string) => void;

  // Telemetry & Live Bus state
  telemetry: BusTelemetry;
  gpsStatus: GpsStatus;
  setGpsStatus: (status: GpsStatus) => void;
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Proximity Alerts
  activeAlert: ProximityAlert | null;
  alertHistory: ProximityAlert[];
  dismissAlert: () => void;
  triggerCustomAlert: (
    tier: ProximityAlert['tier'],
    title: string,
    message: string,
    busNumber?: string,
    stopName?: string,
    distanceKm?: number
  ) => void;

  // Live Telemetry GPS mode & Permissions
  useRealGeolocation: boolean;
  setUseRealGeolocation: (real: boolean) => void;
  locationPermissionState: LocationPermissionState;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  requestLocationPermission: () => Promise<boolean>;
  userGpsCoords: GpsCoordinates | null;

  // Modals
  isAiModalOpen: boolean;
  setIsAiModalOpen: (open: boolean) => void;
  isApkModalOpen: boolean;
  setIsApkModalOpen: (open: boolean) => void;
  isSosModalOpen: boolean;
  setIsSosModalOpen: (open: boolean) => void;

  // Driver & Student Mode
  mode: 'student' | 'driver';
  setMode: (mode: 'student' | 'driver') => void;
  isDriverBroadcasting: boolean;

  // Authentication & Session
  isAuthenticated: boolean;
  currentUser: StudentUser | null;
  loginWithGoogle: (googleData?: { name?: string; email?: string; photoUrl?: string }) => void;
  loginWithCollegeId: (data: { name: string; rollNumber: string; department?: string; busId?: string; stopId?: string }) => void;
  loginAsGuest: () => void;
  logout: () => void;
}

const BusContext = createContext<BusContextType | undefined>(undefined);

export const BusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active navigation tab
  const [activeTab, setActiveTabState] = useState<ActiveTab>('home');

  const setActiveTab = useCallback((tab: ActiveTab) => {
    sound.playClick();
    setActiveTabState(tab);
  }, []);

  // Mode: Student or Driver
  const [mode, setModeState] = useState<'student' | 'driver'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('mode') === 'driver') return 'driver';
    }
    return 'student';
  });

  const setMode = useCallback((newMode: 'student' | 'driver') => {
    sound.playClick();
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newMode === 'driver') {
        url.searchParams.set('mode', 'driver');
      } else {
        url.searchParams.delete('mode');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Live Driver Phone GPS broadcast
  const [liveDriverGps, setLiveDriverGps] = useState<DriverGpsPayload | null>(null);
  const [isDriverBroadcasting, setIsDriverBroadcasting] = useState<boolean>(false);

  // Theme handling
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bus_tracker_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved as ThemeMode;
      }
    }
    return 'dark';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = useMemo(() => {
    if (theme === 'system') {
      return systemPrefersDark;
    }
    return theme === 'dark';
  }, [theme, systemPrefersDark]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    sound.playClick();
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bus_tracker_theme', newTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#070B19' : '#F8FAFC');
    }
  }, [isDark]);

  // Sound
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(sound.isSoundMuted());
  const toggleSound = useCallback(() => {
    const muted = sound.toggleMute();
    setIsSoundMuted(muted);
    gracefulVoice.setEnabled(!muted);
    setIsGracefulVoiceEnabled(!muted);
    if (muted) {
      gracefulVoice.stop();
    }
  }, []);

  // Routes & Vehicles
  const allRoutes = BUS_ROUTES;
  const allBuses = BUS_VEHICLES;

  const [selectedBusId, setSelectedBusId] = useState<string>('bus-07');
  const selectedBus = useMemo(
    () => allBuses.find((b) => b.id === selectedBusId) || allBuses[0],
    [allBuses, selectedBusId]
  );

  const selectedRoute = useMemo(
    () => allRoutes.find((r) => r.id === selectedBus.routeId) || allRoutes[0],
    [allRoutes, selectedBus]
  );

  // Authentication & Session
  const STORAGE_KEY_AUTH = 'dce_bus_tracker_auth_user';
  const [currentUser, setCurrentUser] = useState<StudentUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AUTH);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return null;
  });

  const isAuthenticated = Boolean(currentUser);

  // Student State
  const [student, setStudent] = useState<StudentUser>(() => {
    if (currentUser) return currentUser;
    return DEFAULT_STUDENT;
  });

  useEffect(() => {
    if (currentUser) {
      setStudent(currentUser);
    }
  }, [currentUser]);

  const loginWithGoogle = useCallback((googleData?: { name?: string; email?: string; photoUrl?: string }) => {
    sound.playSuccess();
    const newUser: StudentUser = {
      name: googleData?.name || 'Karthik S.',
      email: googleData?.email || 'karthik.s.dce@gmail.com',
      avatarUrl:
        googleData?.photoUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      id: 'DCE-2024-CSE-042',
      department: 'Computer Science & Engineering',
      semester: '6th Semester - Section A',
      assignedBusId: 'bus-07',
      assignedStopId: 'stop-07-3', // Tambaram West Stand
      lat: 12.9249,
      lng: 80.1165,
      authProvider: 'google',
    };
    setCurrentUser(newUser);
    setStudent(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(newUser));
    }
  }, []);

  const loginWithCollegeId = useCallback((data: { name: string; rollNumber: string; department?: string; busId?: string; stopId?: string }) => {
    sound.playSuccess();
    const newUser: StudentUser = {
      name: data.name || 'DCE Student',
      id: data.rollNumber || 'DCE-2024-STUDENT',
      department: data.department || 'Computer Science & Engineering',
      semester: '6th Semester',
      assignedBusId: data.busId || 'bus-07',
      assignedStopId: data.stopId || 'stop-07-3',
      lat: 12.9249,
      lng: 80.1165,
      authProvider: 'college',
    };
    setCurrentUser(newUser);
    setStudent(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(newUser));
    }
  }, []);

  const loginAsGuest = useCallback(() => {
    sound.playClick();
    const guestUser: StudentUser = {
      ...DEFAULT_STUDENT,
      name: 'Guest Passenger',
      id: 'DCE-GUEST-PASS',
      authProvider: 'guest',
    };
    setCurrentUser(guestUser);
    setStudent(guestUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(guestUser));
    }
  }, []);

  const logout = useCallback(() => {
    sound.playClick();
    setCurrentUser(null);
    setStudent(DEFAULT_STUDENT);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  }, []);

  const studentStop = useMemo(() => {
    const found = selectedRoute.stops.find((s) => s.id === student.assignedStopId);
    return found || selectedRoute.stops[2] || selectedRoute.stops[0];
  }, [selectedRoute, student.assignedStopId]);

  const updateStudentStop = useCallback((stopId: string) => {
    sound.playClick();
    setStudent((prev) => ({ ...prev, assignedStopId: stopId }));
  }, []);

  const selectBus = useCallback((busId: string) => {
    sound.playClick();
    setSelectedBusId(busId);
    const idx = fleetProgressRef.current[busId] ?? 0;
    setWaypointIndex(idx);
  }, []);

  const selectRoute = useCallback((routeId: string) => {
    sound.playClick();
    const busWithRoute = allBuses.find((b) => b.routeId === routeId);
    if (busWithRoute) {
      setSelectedBusId(busWithRoute.id);
      const idx = fleetProgressRef.current[busWithRoute.id] ?? 0;
      setWaypointIndex(idx);
    }
  }, [allBuses]);

  // Real Geolocation & Location Permission
  const [useRealGeolocation, setUseRealGeolocation] = useState<boolean>(false);
  const [locationPermissionState, setLocationPermissionState] = useState<LocationPermissionState>('prompt');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [userGpsCoords, setUserGpsCoords] = useState<GpsCoordinates | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('disabled');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('live');
  const locationWatcherCleanupRef = useRef<(() => void) | null>(null);

  // Fleet Route Waypoint Tracking (multi-bus simulation)
  const fleetProgressRef = useRef<Record<string, number>>({
    'bus-07': 22,
    'bus-04': 14,
    'bus-01': 8,
    'bus-12': 18,
  });
  const [waypointIndex, setWaypointIndex] = useState<number>(() => fleetProgressRef.current['bus-07'] || 20);

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);

  // Proximity Alerts & Throttled Voice Engine
  const [activeAlert, setActiveAlert] = useState<ProximityAlert | null>(null);
  const [alertHistory, setAlertHistory] = useState<ProximityAlert[]>([]);
  const triggeredTiersRef = useRef<Set<string>>(new Set());
  const lastVoiceTimeRef = useRef<number>(0);

  const dismissAlert = useCallback(() => {
    sound.playClick();
    setActiveAlert(null);
  }, []);

  // Transit Voice Assistant Personas & Speeds
  const [isGracefulVoiceEnabled, setIsGracefulVoiceEnabled] = useState<boolean>(() => gracefulVoice.isEnabled());
  const [voiceAssistantId, setVoiceAssistantIdState] = useState<VoiceAssistantId>(() => gracefulVoice.getVoice());
  const [voiceSpeed, setVoiceSpeedState] = useState<VoiceSpeed>(() => gracefulVoice.getSpeed());

  const toggleGracefulVoice = useCallback(() => {
    const updated = gracefulVoice.toggle();
    setIsGracefulVoiceEnabled(updated);
  }, []);

  const setVoiceAssistantId = useCallback((id: VoiceAssistantId) => {
    sound.playClick();
    gracefulVoice.setVoice(id);
    setVoiceAssistantIdState(id);
    gracefulVoice.testVoice(id);
  }, []);

  const setVoiceSpeed = useCallback((speed: VoiceSpeed) => {
    sound.playClick();
    gracefulVoice.setSpeed(speed);
    setVoiceSpeedState(speed);
    gracefulVoice.testVoice(undefined, speed);
  }, []);

  const testGracefulVoice = useCallback((voiceId?: VoiceAssistantId, speed?: VoiceSpeed) => {
    gracefulVoice.testVoice(voiceId, speed);
  }, []);

  const triggerCustomAlert = useCallback(
    (
      tier: ProximityAlert['tier'],
      title: string,
      message: string,
      busNumber?: string,
      stopName?: string,
      distanceKm?: number
    ) => {
      const activeBusNum = busNumber || selectedBus.busNumber;
      const activeStopName = stopName || studentStop.shortName;
      const alert: ProximityAlert = {
        id: `${tier}-${activeBusNum}-${Date.now()}`,
        tier,
        busNumber: activeBusNum,
        stopName: activeStopName,
        distanceKm,
        title,
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };
      setActiveAlert(alert);
      setAlertHistory((prev) => [alert, ...prev.slice(0, 19)]);

      // Native HTML5 Web Push Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`${title} • ${activeBusNum}`, {
            body: message,
            icon: './favicon.svg',
            tag: `${activeBusNum}-${tier}`,
          });
        } catch (_) {}
      }

      // Voice announcements with throttling (at least 3.5s spacing)
      const now = Date.now();
      if (now - lastVoiceTimeRef.current > 3500) {
        lastVoiceTimeRef.current = now;
        const isStudentStop = Boolean(
          activeStopName &&
          (studentStop.name.toLowerCase().includes(activeStopName.toLowerCase()) ||
           activeStopName.toLowerCase().includes(studentStop.shortName.toLowerCase()))
        );

        if (tier === 'arrived' || tier === 'stop-arrived') {
          sound.playArrivalChime();
          sound.triggerHaptic([30, 50, 30]);
          gracefulVoice.announceStopMilestone(
            activeBusNum,
            activeStopName,
            0,
            isStudentStop,
            0,
            true
          );
        } else if (
          tier === '1km' ||
          tier === '500m' ||
          tier === '200m' ||
          tier === 'stop-approaching'
        ) {
          sound.playApproachingChime();
          sound.triggerHaptic(20);
          const eta = Math.max(1, Math.round((distanceKm ?? 1) * 2.5));
          gracefulVoice.announceStopMilestone(
            activeBusNum,
            activeStopName,
            distanceKm ?? 1.0,
            isStudentStop,
            eta,
            false
          );
        }
      }
    },
    [selectedBus.busNumber, studentStop.name, studentStop.shortName]
  );

  // Listen to Driver Phone GPS via Firebase RTDB or local broadcast
  useEffect(() => {
    const unsub = subscribeBusGps(selectedBus.busNumber, (data) => {
      setLiveDriverGps(data);
      setIsDriverBroadcasting(true);
      setConnectionStatus('live');
      setGpsStatus('active');
    });
    return () => unsub();
  }, [selectedBus.busNumber]);

  // Compute Telemetry
  const telemetry = useMemo<BusTelemetry>(() => {
    // If live GPS from Driver is active (within last 60s), use it directly!
    const isLive = liveDriverGps && (Date.now() - liveDriverGps.timestamp < 60000);

    const waypoints = selectedRoute.waypoints;
    const idx = Math.min(Math.max(waypointIndex, 0), waypoints.length - 1);
    
    const currentCoord: [number, number] = isLive
      ? [liveDriverGps.latitude, liveDriverGps.longitude]
      : (waypoints[idx] || waypoints[0]);

    // Bearing
    const nextIdx = Math.min(idx + 1, waypoints.length - 1);
    const nextCoord = waypoints[nextIdx] || currentCoord;
    const bearing = isLive && liveDriverGps.heading
      ? liveDriverGps.heading
      : calculateBearing(currentCoord[0], currentCoord[1], nextCoord[0], nextCoord[1]);

    // Distance to student live position
    const distToStudentMeters = calculateDistanceMeters(
      currentCoord[0],
      currentCoord[1],
      student.lat,
      student.lng
    );

    // Distance to student assigned stop
    const distToStudentStopMeters = calculateDistanceMeters(
      currentCoord[0],
      currentCoord[1],
      studentStop.lat,
      studentStop.lng
    );

    // Identify which stop is next along the route
    let nextStop = selectedRoute.stops[selectedRoute.stops.length - 1];
    let currentStopIdx = 0;
    for (let i = 0; i < selectedRoute.stops.length; i++) {
      const stop = selectedRoute.stops[i];
      const d = calculateDistanceMeters(currentCoord[0], currentCoord[1], stop.lat, stop.lng);
      if (d > 100 && i > currentStopIdx) {
        nextStop = stop;
        currentStopIdx = i;
        break;
      }
    }

    const distToNextStopMeters = calculateDistanceMeters(
      currentCoord[0],
      currentCoord[1],
      nextStop.lat,
      nextStop.lng
    );

    // Speed calculation: from live driver GPS or realistic traffic
    let speed = 34;
    if (isLive) {
      speed = Math.round(liveDriverGps.speed);
    } else {
      if (distToStudentStopMeters < 80 || distToNextStopMeters < 60) {
        speed = 0; // stopped
      } else if (distToStudentStopMeters < 250 || distToNextStopMeters < 200) {
        speed = 18; // slowing down
      } else {
        const wobble = Math.sin(idx * 0.3) * 6;
        speed = Math.round(34 + wobble);
      }
    }

    // ETA calculation
    let etaMinutes = Math.max(1, Math.round(distToStudentStopMeters / 400));
    if (distToStudentStopMeters <= 50) {
      etaMinutes = 0;
    }

    // Status
    let status: BusMovementStatus = 'LIVE';
    if (distToStudentStopMeters <= 40) {
      status = 'ARRIVED';
    } else if (distToStudentStopMeters <= 250) {
      status = 'ARRIVING';
    } else if (distToStudentStopMeters <= 1000) {
      status = 'APPROACHING';
    } else {
      status = 'LIVE';
    }

    return {
      lat: currentCoord[0],
      lng: currentCoord[1],
      bearing,
      speedKmh: speed,
      currentWaypointIndex: idx,
      currentStopIndex: currentStopIdx,
      nextStop,
      distanceToNextStopMeters: Math.round(distToNextStopMeters),
      distanceToStudentStopMeters: Math.round(distToStudentStopMeters),
      distanceToStudentMeters: Math.round(distToStudentMeters),
      etaMinutes,
      status,
      lastUpdated: isLive ? 'Live Driver GPS' : 'Just now',
    };
  }, [selectedRoute, waypointIndex, studentStop, student.lat, student.lng, liveDriverGps]);

  // Native Browser Notification Permission Request
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Natural autonomous route progression loop & multi-bus proximity tracking
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Advance waypoint for every fleet bus along its route
      allBuses.forEach((b) => {
        const r = allRoutes.find((route) => route.id === b.routeId);
        if (!r || !r.waypoints.length) return;
        const current = fleetProgressRef.current[b.id] ?? 0;
        let next = current + 1;
        if (next >= r.waypoints.length) {
          next = 0;
        }
        fleetProgressRef.current[b.id] = next;
      });

      // 2. Sync selectedBus waypointIndex to state for React rendering & map updates
      const currentSelectedIdx = fleetProgressRef.current[selectedBus.id] ?? 0;
      setWaypointIndex(currentSelectedIdx);

      // 3. Proximity evaluation for EACH bus and EACH stop along its route
      const triggered = triggeredTiersRef.current;

      allBuses.forEach((bus) => {
        const busRoute = allRoutes.find((r) => r.id === bus.routeId);
        if (!busRoute || !busRoute.waypoints.length) return;

        const bIdx = fleetProgressRef.current[bus.id] ?? 0;
        const busCoord = busRoute.waypoints[bIdx] || busRoute.waypoints[0];

        // --- A. Proximity to Student / User Location & Stop ---
        // Announce when near to student, stating exact kilometers
        const distToStudentMeters = calculateDistanceMeters(
          busCoord[0],
          busCoord[1],
          studentStop.lat,
          studentStop.lng
        );
        const distKm = parseFloat((distToStudentMeters / 1000).toFixed(1));

        // Prioritize student's assigned bus and the currently selected bus
        const isUserAssignedOrSelected = bus.id === student.assignedBusId || bus.id === selectedBus.id;

        if (isUserAssignedOrSelected) {
          if (distToStudentMeters <= 1200 && distToStudentMeters > 500 && !triggered.has(`${bus.id}-user-1km`)) {
            triggered.add(`${bus.id}-user-1km`);
            triggerCustomAlert(
              '1km',
              `Bus Near You (${distKm} km)`,
              `${bus.busNumber} is ${distKm} km from your location (${studentStop.shortName}). ETA: ~${Math.max(1, Math.round(distKm * 2.5))} mins.`,
              bus.busNumber,
              studentStop.shortName,
              distKm
            );
          } else if (distToStudentMeters <= 500 && distToStudentMeters > 150 && !triggered.has(`${bus.id}-user-500m`)) {
            triggered.add(`${bus.id}-user-500m`);
            triggerCustomAlert(
              '500m',
              `Bus Very Close (${distKm} km)`,
              `${bus.busNumber} is approaching your stop (${studentStop.shortName})! Only ${distKm} km (${Math.round(distToStudentMeters)}m) away. Please prepare to board.`,
              bus.busNumber,
              studentStop.shortName,
              distKm
            );
          } else if (distToStudentMeters <= 150 && distToStudentMeters > 50 && !triggered.has(`${bus.id}-user-200m`)) {
            triggered.add(`${bus.id}-user-200m`);
            triggerCustomAlert(
              '200m',
              `Get Ready! (${distKm} km)`,
              `${bus.busNumber} is reaching ${studentStop.shortName} in less than 1 minute (${distKm} km away).`,
              bus.busNumber,
              studentStop.shortName,
              distKm
            );
          } else if (distToStudentMeters <= 50 && !triggered.has(`${bus.id}-user-arrived`)) {
            triggered.add(`${bus.id}-user-arrived`);
            triggerCustomAlert(
              'arrived',
              `✓ ${bus.busNumber} Arrived at Your Location`,
              `${bus.busNumber} has arrived at ${studentStop.name}. Please board the bus now.`,
              bus.busNumber,
              studentStop.name,
              0
            );
          }

          // Reset user milestone keys when bus moves far past the stop
          if (distToStudentMeters > 2000) {
            triggered.delete(`${bus.id}-user-1km`);
            triggered.delete(`${bus.id}-user-500m`);
            triggered.delete(`${bus.id}-user-200m`);
            triggered.delete(`${bus.id}-user-arrived`);
          }
        }

        // --- B. Proximity to EACH STOP of the bus route ---
        busRoute.stops.forEach((stop) => {
          const distToStopMeters = calculateDistanceMeters(
            busCoord[0],
            busCoord[1],
            stop.lat,
            stop.lng
          );
          const stopDistKm = parseFloat((distToStopMeters / 1000).toFixed(1));

          // Approaching milestone for this stop (between 150m and 1000m)
          if (
            distToStopMeters <= 1000 &&
            distToStopMeters > 150 &&
            !triggered.has(`${bus.id}-stop-${stop.id}-appr`)
          ) {
            triggered.add(`${bus.id}-stop-${stop.id}-appr`);
            triggerCustomAlert(
              'stop-approaching',
              `${bus.busNumber} Approaching ${stop.shortName}`,
              `${bus.busNumber} is ${stopDistKm} km from ${stop.name}.`,
              bus.busNumber,
              stop.shortName,
              stopDistKm
            );
          }
          // Arrived milestone for this stop (<= 60m)
          else if (
            distToStopMeters <= 60 &&
            !triggered.has(`${bus.id}-stop-${stop.id}-arr`)
          ) {
            triggered.add(`${bus.id}-stop-${stop.id}-arr`);
            triggerCustomAlert(
              'stop-arrived',
              `✓ ${bus.busNumber} Arrived at ${stop.shortName}`,
              `${bus.busNumber} has reached ${stop.name}.`,
              bus.busNumber,
              stop.shortName,
              0
            );
          }
          // Reset stop alert flags when bus moves away (> 1600m)
          else if (
            distToStopMeters > 1600 &&
            (triggered.has(`${bus.id}-stop-${stop.id}-appr`) ||
             triggered.has(`${bus.id}-stop-${stop.id}-arr`))
          ) {
            triggered.delete(`${bus.id}-stop-${stop.id}-appr`);
            triggered.delete(`${bus.id}-stop-${stop.id}-arr`);
          }
        });
      });
    }, 1100);

    return () => clearInterval(timer);
  }, [allBuses, allRoutes, selectedBus, student.assignedBusId, studentStop, triggerCustomAlert]);

  // Real Geolocation watcher
  const startLocationTracking = useCallback(() => {
    if (locationWatcherCleanupRef.current) {
      locationWatcherCleanupRef.current();
    }
    const stopWatch = watchUserLocation(
      (coords) => {
        setUserGpsCoords(coords);
        setGpsStatus('active');
        setLocationPermissionState('granted');
        setUseRealGeolocation(true);
        setStudent((prev) => ({
          ...prev,
          lat: coords.lat,
          lng: coords.lng,
        }));
      },
      (err) => {
        console.warn('[Location] GPS stream notice:', err);
      }
    );
    locationWatcherCleanupRef.current = stopWatch;
  }, []);

  // Request Location Access from user
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    setGpsStatus('improving');
    try {
      const result = await requestLocationAccess();
      if (result.granted && result.coords) {
        sound.playClick();
        setLocationPermissionState('granted');
        setUseRealGeolocation(true);
        setGpsStatus('active');
        setUserGpsCoords(result.coords);

        const lat = result.coords.lat;
        const lng = result.coords.lng;

        setStudent((prev) => ({
          ...prev,
          lat,
          lng,
        }));

        // Dynamically find nearest stop on selected route
        let nearestStop = selectedRoute.stops[0];
        let minDist = Infinity;
        for (const stop of selectedRoute.stops) {
          const d = calculateDistanceMeters(lat, lng, stop.lat, stop.lng);
          if (d < minDist) {
            minDist = d;
            nearestStop = stop;
          }
        }
        if (minDist < 6000) {
          setStudent((prev) => ({ ...prev, assignedStopId: nearestStop.id }));
        }

        startLocationTracking();
        return true;
      } else {
        setLocationPermissionState('denied');
        setGpsStatus('disabled');
        return false;
      }
    } catch {
      setLocationPermissionState('denied');
      setGpsStatus('disabled');
      return false;
    }
  }, [selectedRoute, startLocationTracking]);

  // Check location permission on mount and trigger prompt if not granted
  useEffect(() => {
    let active = true;
    checkLocationPermission().then((status) => {
      if (!active) return;
      if (status === 'granted') {
        setLocationPermissionState('granted');
        setUseRealGeolocation(true);
        setGpsStatus('active');
        startLocationTracking();
      } else if (status === 'denied') {
        setLocationPermissionState('denied');
        setGpsStatus('disabled');
      } else {
        setLocationPermissionState('prompt');
        // Prompt user after 1.8 seconds (once splash screen wraps up)
        const timer = setTimeout(() => {
          if (active) {
            setIsLocationModalOpen(true);
          }
        }, 1800);
        return () => clearTimeout(timer);
      }
    });

    return () => {
      active = false;
      if (locationWatcherCleanupRef.current) {
        locationWatcherCleanupRef.current();
        locationWatcherCleanupRef.current = null;
      }
    };
  }, [startLocationTracking]);

  return (
    <BusContext.Provider
      value={{
        activeTab,
        setActiveTab,
        theme,
        setTheme,
        isDark,
        isSoundMuted,
        toggleSound,
        isGracefulVoiceEnabled,
        toggleGracefulVoice,
        testGracefulVoice,
        voiceAssistantId,
        setVoiceAssistantId,
        voiceSpeed,
        setVoiceSpeed,
        allRoutes,
        allBuses,
        selectedRoute,
        selectedBus,
        selectBus,
        selectRoute,
        student,
        studentStop,
        updateStudentStop,
        telemetry,
        gpsStatus,
        setGpsStatus,
        connectionStatus,
        setConnectionStatus,
        activeAlert,
        alertHistory,
        dismissAlert,
        triggerCustomAlert,
        useRealGeolocation,
        setUseRealGeolocation,
        locationPermissionState,
        isLocationModalOpen,
        setIsLocationModalOpen,
        requestLocationPermission,
        userGpsCoords,
        isAiModalOpen,
        setIsAiModalOpen,
        isApkModalOpen,
        setIsApkModalOpen,
        isSosModalOpen,
        setIsSosModalOpen,
        mode,
        setMode,
        isDriverBroadcasting,
        isAuthenticated,
        currentUser,
        loginWithGoogle,
        loginWithCollegeId,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </BusContext.Provider>
  );
};

export const useBus = (): BusContextType => {
  const context = useContext(BusContext);
  if (!context) {
    throw new Error('useBus must be used within a BusProvider');
  }
  return context;
};
