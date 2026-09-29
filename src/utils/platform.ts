import { Capacitor } from '@capacitor/core';

/**
 * Checks whether the current runtime environment is a compiled native mobile app (Android APK / iOS).
 * Returns true ONLY when executing inside the Capacitor native runtime container.
 */
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Checks whether the application is running inside a standard Web Browser (Desktop or Mobile Web).
 * Admin and Staff management portals are restricted exclusively to Web Browsers.
 */
export const isWebBrowser = (): boolean => {
  return !Capacitor.isNativePlatform();
};

/**
 * Returns current platform name: 'android', 'ios', or 'web'
 */
export const getPlatformName = (): string => {
  return Capacitor.getPlatform();
};
