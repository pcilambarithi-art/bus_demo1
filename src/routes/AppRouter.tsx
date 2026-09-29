import React, { useState, useEffect, useCallback } from 'react';
import { isNativeApp } from '../utils/platform';
import { busApiService } from '../services/busApiService';
import { AdminLoginScreen } from '../screens/admin/AdminLoginScreen';
import { AdminDashboard } from '../screens/admin/AdminDashboard';
import { StaffLoginScreen } from '../screens/staff/StaffLoginScreen';
import { StaffDashboard } from '../screens/staff/StaffDashboard';
import { APKRestrictedScreen } from '../screens/common/APKRestrictedScreen';

export type AppPortalRoute =
  | 'student'
  | 'admin-login'
  | 'admin-dashboard'
  | 'staff-login'
  | 'staff-dashboard'
  | 'apk-restricted';

interface AppRouterProps {
  children: React.ReactNode;
}

export const AppRouter: React.FC<AppRouterProps> = ({ children }) => {
  const detectRoute = useCallback((): AppPortalRoute => {
    if (typeof window === 'undefined') return 'student';

    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    const portalParam = search.get('portal');
    const modeParam = search.get('mode');

    const isAdminLogin = path.includes('/admin/login') || hash.includes('/admin/login') || portalParam === 'admin-login';
    const isAdminDashboard = path.includes('/admin/dashboard') || hash.includes('/admin/dashboard') || portalParam === 'admin' || portalParam === 'admin-dashboard';
    const isStaffLogin = path.includes('/staff/login') || hash.includes('/staff/login') || portalParam === 'staff-login';
    const isStaffDashboard = path.includes('/staff/dashboard') || hash.includes('/staff/dashboard') || portalParam === 'staff' || portalParam === 'staff-dashboard' || modeParam === 'driver';

    // CRITICAL REQUIREMENT: Native APK must NEVER access Admin or Staff portals
    if (isNativeApp()) {
      if (isAdminLogin || isAdminDashboard || isStaffLogin || isStaffDashboard) {
        return 'apk-restricted';
      }
      return 'student';
    }

    // Web Browser Routing Logic
    if (isAdminDashboard) {
      const hasAdminToken = Boolean(busApiService.getAdminToken());
      return hasAdminToken ? 'admin-dashboard' : 'admin-login';
    }
    if (isAdminLogin) {
      const hasAdminToken = Boolean(busApiService.getAdminToken());
      return hasAdminToken ? 'admin-dashboard' : 'admin-login';
    }

    if (isStaffDashboard) {
      const hasStaffToken = Boolean(busApiService.getStaffToken());
      return hasStaffToken ? 'staff-dashboard' : 'staff-login';
    }
    if (isStaffLogin) {
      const hasStaffToken = Boolean(busApiService.getStaffToken());
      return hasStaffToken ? 'staff-dashboard' : 'staff-login';
    }

    return 'student';
  }, []);

  const [currentRoute, setCurrentRoute] = useState<AppPortalRoute>(detectRoute);

  // Sync with browser navigation (popstate / hashchange)
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentRoute(detectRoute());
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // Custom navigation event for in-app transitions
    const handleCustomNav = (e: any) => {
      if (e.detail?.route) {
        navigateTo(e.detail.route);
      }
    };
    window.addEventListener('dce_navigate', handleCustomNav);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('dce_navigate', handleCustomNav);
    };
  }, [detectRoute]);

  const navigateTo = (route: AppPortalRoute) => {
    // If native APK, prevent any navigation to admin/staff
    if (isNativeApp() && route !== 'student') {
      setCurrentRoute('apk-restricted');
      return;
    }

    setCurrentRoute(route);

    if (typeof window !== 'undefined') {
      let newHash = '';
      if (route === 'admin-login') newHash = '#/admin/login';
      else if (route === 'admin-dashboard') newHash = '#/admin/dashboard';
      else if (route === 'staff-login') newHash = '#/staff/login';
      else if (route === 'staff-dashboard') newHash = '#/staff/dashboard';
      else newHash = '';

      const url = new URL(window.location.href);
      if (newHash) {
        url.hash = newHash;
        url.searchParams.delete('portal');
        url.searchParams.delete('mode');
      } else {
        url.hash = '';
        url.searchParams.delete('portal');
        url.searchParams.delete('mode');
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  // Route Dispatcher
  if (currentRoute === 'apk-restricted') {
    return <APKRestrictedScreen onReturnToTracking={() => navigateTo('student')} />;
  }

  if (currentRoute === 'admin-login') {
    return (
      <AdminLoginScreen
        onLoginSuccess={() => navigateTo('admin-dashboard')}
        onNavigateHome={() => navigateTo('student')}
      />
    );
  }

  if (currentRoute === 'admin-dashboard') {
    return (
      <AdminDashboard
        onLogout={() => navigateTo('admin-login')}
        onNavigateHome={() => navigateTo('student')}
      />
    );
  }

  if (currentRoute === 'staff-login') {
    return (
      <StaffLoginScreen
        onLoginSuccess={() => navigateTo('staff-dashboard')}
        onNavigateHome={() => navigateTo('student')}
      />
    );
  }

  if (currentRoute === 'staff-dashboard') {
    return (
      <StaffDashboard
        onLogout={() => navigateTo('staff-login')}
        onNavigateHome={() => navigateTo('student')}
      />
    );
  }

  // Default: Public Student/User Bus Tracking App
  return <>{children}</>;
};

/**
 * Global helper to trigger navigation from anywhere in web components
 */
export const navigateToPortal = (route: AppPortalRoute) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dce_navigate', { detail: { route } }));
  }
};
