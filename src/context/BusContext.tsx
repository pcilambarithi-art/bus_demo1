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
  triggerCustomAlert: (tier: ProximityAlert['tier'], title: string, message: string) => void;

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
  }, []);

  const selectRoute = useCallback((routeId: string) => {
    sound.playClick();
    const busWithRoute = allBuses.find((b) => b.routeId === routeId);
    if (busWithRoute) {
      setSelectedBusId(busWithRoute.id);
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

  // Real-time Route Waypoint Tracking
  const currentWaypointIndexRef = useRef<number>(20); // Start midway
  const [waypointIndex, setWaypointIndex] = useState<number>(20);

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);

  // Proximity Alerts
  const [activeAlert, setActiveAlert] = useState<ProximityAlert | null>(null);
  const [alertHistory, setAlertHistory] = useState<ProximityAlert[]>([]);
  const triggeredTiersRef = useRef<Set<string>>(new Set());

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

  const triggerCustomAlert = useCallback((tier: ProximityAlert['tier'], title: string, message: string) => {
    const alert: ProximityAlert = {
      id: `${tier}-${Date.now()}`,
      tier,
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setActiveAlert(alert);
    setAlertHistory((prev) => [alert, ...prev.slice(0, 9)]);

    if (tier === '1km' || tier === '500m' || tier === '200m') {
      sound.playApproachingChime();
      sound.triggerHaptic(20);
      gracefulVoice.announceBusMilestone(tier, selectedBus.busNumber, studentStop.shortName);
    } else if (tier === 'arrived') {
      sound.playArrivalChime();
      sound.triggerHaptic([30, 50, 30]);
      gracefulVoice.announceBusMilestone('arrived', selectedBus.busNumber, studentStop.shortName);
    }
  }, [selectedBus.busNumber, studentStop.shortName]);

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

  // Check proximity alert triggers
  useEffect(() => {
    const dist = telemetry.distanceToStudentStopMeters;
    const triggered = triggeredTiersRef.current;

    if (dist <= 1000 && dist > 500 && !triggered.has('1km')) {
      triggered.add('1km');
      triggerCustomAlert(
        '1km',
        'Bus approaching',
        `Your bus is about 1 km from your stop (${studentStop.name}).`
      );
    } else if (dist <= 500 && dist > 200 && !triggered.has('500m')) {
      triggered.add('500m');
      triggerCustomAlert(
        '500m',
        'Your bus is very close',
        `Distance: ~${Math.round(dist)}m. Walking time to ${studentStop.shortName} is 2 mins.`
      );
    } else if (dist <= 200 && dist > 40 && !triggered.has('200m')) {
      triggered.add('200m');
      triggerCustomAlert(
        '200m',
        'Get ready!',
        `Your bus will reach ${studentStop.shortName} shortly.`
      );
    } else if (dist <= 40 && !triggered.has('arrived')) {
      triggered.add('arrived');
      triggerCustomAlert(
        'arrived',
        '✓ Bus Arrived',
        `Bus ${selectedBus.busNumber} has reached ${studentStop.name}.`
      );
    }

    // Reset if bus moves far away (new loop)
    if (dist > 1500 && triggered.size > 0) {
      triggered.clear();
    }
  }, [telemetry.distanceToStudentStopMeters, studentStop, selectedBus.busNumber, triggerCustomAlert]);

  // Natural autonomous route progression loop
  useEffect(() => {
    const timer = setInterval(() => {
      const waypoints = selectedRoute.waypoints;
      let nextIndex = currentWaypointIndexRef.current + 1;
      if (nextIndex >= waypoints.length) {
        nextIndex = 0; // Loop around route
        triggeredTiersRef.current.clear();
      }
      currentWaypointIndexRef.current = nextIndex;
      setWaypointIndex(nextIndex);
    }, 1100);

    return () => clearInterval(timer);
  }, [selectedRoute]);

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
