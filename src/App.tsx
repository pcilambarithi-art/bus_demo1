import React, { useState } from 'react';
import { BusProvider, useBus } from './context/BusContext';
import { SplashScreen } from './components/SplashScreen';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DesktopSidebar } from './components/DesktopSidebar';
import { GlassNotification } from './components/GlassNotification';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ApkModal } from './components/ApkModal';
import { SosModal } from './components/SosModal';
import { LocationPermissionModal } from './components/LocationPermissionModal';

import { HomeScreen } from './screens/HomeScreen';
import { LiveBusScreen } from './screens/LiveBusScreen';
import { RouteScreen } from './screens/RouteScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { DriverScreen } from './screens/DriverScreen';
import { LoginScreen } from './screens/LoginScreen';

const MainAppLayout: React.FC = () => {
  const { activeTab, isAiModalOpen, setIsAiModalOpen } = useBus();
  const [splashFinished, setSplashFinished] = useState(false);

  return (
    <div className="min-h-screen relative flex flex-col overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      
      {/* Premium Startup Splash Screen (Requirement 17) */}
      {!splashFinished && (
        <SplashScreen onComplete={() => setSplashFinished(true)} />
      )}

      {/* Floating In-App Proximity Glass Notification (Requirements 11 & 12) */}
      <GlassNotification />

      {/* Ambient Atmospheric Background Light Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top-Right Cyan Glow */}
        <div className="absolute -top-32 -right-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full dark:bg-cyan-500/10 bg-cyan-400/15 blur-[120px] transform-gpu" />
        {/* Bottom-Left Blue Glow */}
        <div className="absolute top-1/2 -left-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full dark:bg-blue-600/10 bg-blue-400/10 blur-[130px] transform-gpu" />
        {/* Soft Center Accent */}
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full dark:bg-indigo-600/10 bg-indigo-300/15 blur-[140px] transform-gpu" />
      </div>

      {/* Top Navbar */}
      <Navbar />

      {/* Responsive Content Shell (Requirement 21) */}
      <div className="relative z-10 flex-1 flex w-full max-w-[1700px] mx-auto">
        
        {/* Left Glass Sidebar (Desktop only) */}
        <DesktopSidebar />

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 p-3 sm:p-5 lg:p-7 overflow-y-auto">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'live' && <LiveBusScreen />}
          {activeTab === 'route' && <RouteScreen />}
          {activeTab === 'profile' && <ProfileScreen />}
        </main>
      </div>

      {/* Floating Glass Bottom Navigation Bar (Mobile / Tablet only - Requirement 8) */}
      <BottomNav />

      {/* Interactive Global Modals */}
      <AiAssistantModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
      <LocationPermissionModal />
      <ApkModal />
      <SosModal />

    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, mode } = useBus();

  // When mode === 'driver' (e.g. ?mode=driver), render Driver Cockpit
  if (mode === 'driver') {
    return <DriverScreen />;
  }

  // When not logged in, show Login Screen first!
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainAppLayout />;
};

export const App: React.FC = () => {
  return (
    <BusProvider>
      <AppContent />
    </BusProvider>
  );
};

export default App;
