/**
 * DCE Transit AI — Real-Time GPS Geolocation Service
 * Supports Capacitor Geolocation (Android Native) & Browser Web Geolocation API
 */

import { Geolocation, type Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface GpsCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export type PermissionStatusType = 'granted' | 'denied' | 'prompt' | 'unavailable';

const STORAGE_KEY_PERMISSION_ASKED = 'dce_bus_tracker_gps_prompted';

/**
 * Checks current location permission status without prompting
 */
export const checkLocationPermission = async (): Promise<PermissionStatusType> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location === 'granted') return 'granted';
      if (status.location === 'denied') return 'denied';
      return 'prompt';
    } catch {
      // Fallback to web
    }
  }

  if (typeof window !== 'undefined' && 'navigator' in window && 'permissions' in navigator) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state === 'granted') return 'granted';
      if (status.state === 'denied') return 'denied';
      return 'prompt';
    } catch {
      // Fallback
    }
  }

  if (typeof window !== 'undefined' && 'geolocation' in navigator) {
    return 'prompt';
  }

  return 'unavailable';
};

/**
 * Prompts user for device location access and acquires initial coordinates
 */
export const requestLocationAccess = async (): Promise<{
  granted: boolean;
  coords?: GpsCoordinates;
  error?: string;
}> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_PERMISSION_ASKED, 'true');
  }

  // 1. Android Native via Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      const permResult = await Geolocation.requestPermissions();
      if (permResult.location === 'denied') {
        return { granted: false, error: 'Location permission was denied by user.' };
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 3000,
      });

      return {
        granted: true,
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        },
      };
    } catch (err: any) {
      console.warn('[Location] Capacitor Geolocation error, falling back to Web Geolocation:', err);
    }
  }

  // 2. Web Geolocation API (Mobile & Desktop Browsers)
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return { granted: false, error: 'Geolocation is not supported on this device/browser.' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          granted: true,
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp,
          },
        });
      },
      (err) => {
        let msg = 'Failed to acquire location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access to track your bus.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal is currently unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please check device GPS settings.';
        }
        resolve({ granted: false, error: msg });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 3000,
      }
    );
  });
};

/**
 * Watches real-time GPS location updates
 */
export const watchUserLocation = (
  onCoords: (coords: GpsCoordinates) => void,
  onError?: (error: string) => void
): (() => void) => {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    onError?.('Geolocation is not available');
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp,
      });
    },
    (err) => {
      onError?.(err.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
};
