import React, { useMemo } from 'react';
import { useBus } from '../context/BusContext';
import { GlassCard } from '../components/GlassCard';
import { InteractiveMap } from '../components/InteractiveMap';
import { EtaDisplay } from '../components/EtaDisplay';
import { formatDistance } from '../utils/geo';
import {
  ArrowRight,
  Gauge,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const {
    student,
    studentStop,
    selectedBus,
    selectedRoute,
    telemetry,
    setActiveTab,
    locationPermissionState,
    setIsLocationModalOpen,
    allBuses,
    selectBus,
  } = useBus();

  // Dynamic time greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  return (
    <div className="w-full h-full flex flex-col space-y-3 sm:space-y-5 pb-28 sm:pb-24 lg:pb-6 animate-[fadeIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* Top Greeting Header */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 sm:gap-2 px-1">
        <div>
          <h2 className="text-base sm:text-2xl font-black tracking-tight dark:text-white text-slate-900 leading-tight">
            {greeting}, {student.name.split(' ')[0]} 👋
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
            Bus is actively en route to your stop
          </p>
        </div>

        {/* Assigned Stop Tag */}
        <div className="flex items-center gap-2 self-start xs:self-auto">
          <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold backdrop-blur-md dark:bg-white/5 bg-slate-100 dark:border dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-700">
            Assigned: <strong className="text-cyan-500 dark:text-cyan-400">{studentStop.shortName}</strong>
          </span>
        </div>
      </div>

      {/* Fleet Bus Quick Selector */}
      <div className="flex flex-col gap-1.5 px-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Choose Bus to Track (Live Status Only For Selected Bus)
          </span>
          <span className="text-[10px] text-cyan-500 dark:text-cyan-400 font-mono font-semibold">
            {allBuses.length} Buses
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
          {allBuses.map((bus) => {
            const isSelected = bus.id === selectedBus.id;
            return (
              <button
                key={bus.id}
                onClick={() => selectBus(bus.id)}
                className={`
                  flex items-center gap-2 p-1.5 pr-3 rounded-2xl transition-all duration-200 active:scale-95 shrink-0 border select-none
                  ${
                    isSelected
                      ? 'dark:bg-cyan-500/20 bg-cyan-50 border-cyan-400 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400'
                      : 'dark:bg-white/5 bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:border-cyan-400/40'
                  }
                `}
              >
                {/* Thumbnail image */}
                <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-cyan-400/30">
                  <img
                    src={bus.busImage}
                    alt={bus.busNumber}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-cyan-500/20" />
                  )}
                </div>

                <div className="text-left leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-mono">
                      {bus.busNumber}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[90px]">
                    {bus.routeId.replace('route-', 'Route ')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* GPS Location Access Request Banner (Shows if not yet granted) */}
      {locationPermissionState !== 'granted' && (
        <div
          onClick={() => setIsLocationModalOpen(true)}
          className="p-3 sm:p-4 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/15 border border-cyan-400/30 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer hover:border-cyan-400/50 active:scale-99 transition-all shadow-[0_4px_20px_rgba(6,182,212,0.15)] group"
        >
          <div className="flex items-start xs:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-400/30 group-hover:scale-105 transition-transform mt-0.5 xs:mt-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold dark:text-white text-slate-900 leading-tight">
                  Allow GPS Location Access
                </h4>
                <span className="px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-cyan-500 text-black">
                  Recommended
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-300 mt-0.5 leading-snug line-clamp-2">
                Grant device location to track Bus {selectedBus.busNumber}, calculate walking ETA, and receive voice chimes.
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLocationModalOpen(true);
            }}
            className="w-full xs:w-auto px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-md shrink-0 active:scale-95 transition-all text-center"
          >
            Allow GPS
          </button>
        </div>
      )}

      {/* HERO GLASS BUS CARD */}
      <GlassCard
        onClick={() => setActiveTab('live')}
        interactive
        hoverEffect
        className="p-3.5 sm:p-6 group"
      >
        <div className="flex flex-col gap-2.5 sm:gap-4">
          {/* Top row: Bus number, Live Image Thumbnail and Live Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl overflow-hidden border border-cyan-400/40 shadow-[0_4px_20px_rgba(6,182,212,0.4)] shrink-0 group-hover:scale-105 transition-transform duration-300">
                <img
                  key={selectedBus.id}
                  src={selectedBus.busImage}
                  alt={selectedBus.busNumber}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-sm text-[8px] font-mono text-center text-cyan-300 font-bold leading-tight py-0.5">
                  LIVE
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h3 className="text-base sm:text-2xl font-black dark:text-white text-slate-900 tracking-tight font-sans truncate">
                    {selectedBus.busNumber}
                  </h3>
                  {/* LIVE Status Badge */}
                  <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                  {selectedRoute.name}
                </p>
              </div>
            </div>

            {/* Tap to View Full Screen Indicator */}
            <div className="flex items-center gap-1 text-xs font-bold text-cyan-500 dark:text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0 pl-2">
              <span className="hidden sm:inline">Track Live</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* Middle Row: Speed, ETA, and Distance - Harmonized Pixel Perfect Font Sizing */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-3 pt-2 sm:pt-3 border-t dark:border-white/10 border-slate-200/80">
            {/* Speed */}
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50 flex flex-col justify-between">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                <Gauge className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">Speed</span>
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-xl font-bold font-mono dark:text-white text-slate-900">
                  {telemetry.speedKmh}
                </span>
                <span className="text-[10px] sm:text-xs font-normal text-slate-400 font-sans">km/h</span>
              </div>
            </div>

            {/* ETA */}
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50 flex flex-col justify-between">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">ETA</span>
              </span>
              <div className="flex items-baseline">
                <EtaDisplay minutes={telemetry.etaMinutes} size="sm" className="text-emerald-500 dark:text-emerald-400 font-bold" />
              </div>
            </div>

            {/* Distance Away */}
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50 flex flex-col justify-between">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="truncate">Distance</span>
              </span>
              <div className="flex items-baseline">
                <span className="text-base sm:text-xl font-bold font-mono dark:text-white text-slate-900 truncate">
                  {formatDistance(telemetry.distanceToStudentStopMeters)}
                </span>
              </div>
            </div>

            {/* Capacity (Desktop only) */}
            <div className="hidden sm:flex p-3 rounded-2xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50 flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                Available Seats
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono dark:text-white text-slate-900">
                {selectedBus.capacity - selectedBus.currentOccupancy}
                <span className="text-xs font-normal text-slate-400"> / {selectedBus.capacity}</span>
              </span>
            </div>
          </div>

          {/* Live Vehicle Feed Showcase (Updates dynamically with chosen bus) */}
          <div className="relative rounded-2xl overflow-hidden border dark:border-white/10 border-slate-200/80 bg-slate-950 shadow-md">
            <div className="relative h-28 sm:h-36 w-full overflow-hidden">
              <img
                key={selectedBus.id}
                src={selectedBus.busImage}
                alt={selectedBus.busNumber}
                className="w-full h-full object-cover object-center transition-all duration-700 group-hover:scale-105 animate-[fadeIn_0.35s_ease-out]"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/20" />

              {/* Top Live Badges */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 text-white text-[9px] sm:text-[10px] font-mono shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-bold tracking-wider">LIVE VEHICLE FEED</span>
              </div>

              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 backdrop-blur-md text-[9px] sm:text-[10px] font-bold">
                  {selectedBus.hasAC ? '❄️ AC Coach' : 'Standard Coach'}
                </span>
              </div>

              {/* Bottom Photo Overlay Data */}
              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-black text-xs sm:text-sm tracking-tight font-mono drop-shadow-md">
                      {selectedBus.busNumber}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-400/40 backdrop-blur-md">
                      {selectedBus.plateNumber}
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-300 truncate mt-0.5 drop-shadow">
                    Driver: <strong>{selectedBus.driverName}</strong> (★ {selectedBus.driverRating})
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Capacity</span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400">
                    {selectedBus.capacity - selectedBus.currentOccupancy} Seats Free
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Destination & Stop proximity */}
          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-white/5">
            <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
              <span className="truncate">Next: <strong className="text-slate-700 dark:text-slate-200">{telemetry.nextStop.name}</strong></span>
            </div>
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0 text-[10px] sm:text-xs whitespace-nowrap">
              {formatDistance(telemetry.distanceToStudentStopMeters)} to your stop
            </span>
          </div>
        </div>
      </GlassCard>

      {/* LIVE MAP SECTION (Spacious and clean on mobile) */}
      <div className="flex-1 min-h-[350px] sm:min-h-[440px] lg:min-h-[500px] flex flex-col rounded-[24px] overflow-hidden border dark:border-white/10 border-slate-200 shadow-xl relative">
        <div className="absolute top-3 left-4 z-20 pointer-events-none">
          <span className="text-[10px] sm:text-xs font-extrabold tracking-wider uppercase px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full backdrop-blur-xl bg-slate-900/80 text-white border border-white/10 shadow-md">
            LIVE MAP
          </span>
        </div>

        <InteractiveMap
          className="flex-1 w-full h-full"
          showControls={true}
          showPlacesSearch={false}
        />
      </div>

    </div>
  );
};
