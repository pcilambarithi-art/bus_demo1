import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, MapPin, Building2, Navigation, Compass } from 'lucide-react';
import { useBus } from '../context/BusContext';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import { BUS_ROUTES } from '../data/busRoutes';
import { searchNominatim } from '../services/nominatim';

interface PlacesSearchBarProps {
  onSelectPlace?: (place: { name: string; lat: number; lng: number }) => void;
  className?: string;
}

interface SearchItem {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  type: 'stop' | 'landmark';
  routeCode?: string;
  stopId?: string;
}

// Comprehensive catalog of Chennai transit hubs, metro stops, and DCE route anchors
const CHENNAI_LANDMARKS: SearchItem[] = [
  {
    id: 'lm-1',
    name: 'Chennai International Airport (MAA)',
    subtitle: 'Meenambakkam, GST Road, Chennai',
    lat: 12.9941,
    lng: 80.1709,
    type: 'landmark',
  },
  {
    id: 'lm-2',
    name: 'Alandur Metro Interchange',
    subtitle: 'Kathipara, Alandur, Chennai',
    lat: 13.0042,
    lng: 80.2015,
    type: 'landmark',
  },
  {
    id: 'lm-3',
    name: 'Koyambedu CMBT Bus Terminus',
    subtitle: 'Koyambedu, Inner Ring Road, Chennai',
    lat: 13.0694,
    lng: 80.1948,
    type: 'landmark',
  },
  {
    id: 'lm-4',
    name: 'Tambaram Railway Station & Bus Terminus',
    subtitle: 'GST Road / Mudichur Road, Tambaram, Chennai',
    lat: 12.9249,
    lng: 80.1165,
    type: 'landmark',
  },
  {
    id: 'lm-5',
    name: 'Porur Junction & Toll Plaza',
    subtitle: 'Arcot Road / Mount-Poonamallee Road, Porur',
    lat: 13.0335,
    lng: 80.1583,
    type: 'landmark',
  },
  {
    id: 'lm-6',
    name: 'Chromepet MIT Campus & Railway Station',
    subtitle: 'Radha Nagar / GST Road, Chromepet',
    lat: 12.9516,
    lng: 80.1462,
    type: 'landmark',
  },
  {
    id: 'lm-7',
    name: 'Dhanalakshmi College of Engineering (DCE)',
    subtitle: 'Main Campus, Dr. V. P. R. Nagar, Manimangalam, Chennai',
    lat: 12.9165,
    lng: 80.0435,
    type: 'landmark',
  },
  {
    id: 'lm-8',
    name: 'Vandalur Zoo Junction (Arignar Anna)',
    subtitle: 'GST Road, Vandalur, Chennai',
    lat: 12.8797,
    lng: 80.0811,
    type: 'landmark',
  },
  {
    id: 'lm-9',
    name: 'Kundrathur Murugan Temple Arch',
    subtitle: 'Kundrathur Main Road, Chennai',
    lat: 12.998,
    lng: 80.097,
    type: 'landmark',
  },
  {
    id: 'lm-10',
    name: 'Perungalathur Bye-Pass Junction',
    subtitle: 'GST Road, Perungalathur, Chennai',
    lat: 12.905,
    lng: 80.093,
    type: 'landmark',
  },
];

export const PlacesSearchBar: React.FC<PlacesSearchBarProps> = ({ onSelectPlace, className = '' }) => {
  const { selectedRoute, updateStudentStop, telemetry } = useBus();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [nominatimResults, setNominatimResults] = useState<SearchItem[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounced OpenStreetMap Nominatim Search
  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 3) {
      setNominatimResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const places = await searchNominatim(clean);
        const items: SearchItem[] = places.map((p) => ({
          id: `nom-${p.id}`,
          name: p.name,
          subtitle: p.displayName,
          lat: p.lat,
          lng: p.lng,
          type: 'landmark',
        }));
        setNominatimResults(items);
      } catch {
        // Ignore search errors
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compile all route stops into searchable items
  const allStopsCatalog = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    const seen = new Set<string>();

    BUS_ROUTES.forEach((route) => {
      route.stops.forEach((stop) => {
        const key = `${stop.lat.toFixed(4)}-${stop.lng.toFixed(4)}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            id: `stop-${stop.id}`,
            name: stop.name,
            subtitle: `${route.name} (Stop #${stop.sequence})`,
            lat: stop.lat,
            lng: stop.lng,
            type: 'stop',
            routeCode: route.code,
            stopId: stop.id,
          });
        }
      });
    });

    return items;
  }, []);

  // Filtered results based on search query
  const searchResults = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const matchedStops = allStopsCatalog.filter(
      (item) =>
        item.name.toLowerCase().includes(cleanQuery) ||
        item.subtitle.toLowerCase().includes(cleanQuery)
    );

    const matchedLandmarks = CHENNAI_LANDMARKS.filter(
      (item) =>
        item.name.toLowerCase().includes(cleanQuery) ||
        item.subtitle.toLowerCase().includes(cleanQuery)
    );

    // Merge and compute proximity to current bus telemetry
    return [...matchedStops, ...matchedLandmarks, ...nominatimResults]
      .map((item) => {
        const distToBus = calculateDistanceMeters(telemetry.lat, telemetry.lng, item.lat, item.lng);
        return { ...item, distToBus };
      })
      .sort((a, b) => a.distToBus - b.distToBus)
      .slice(0, 8);
  }, [query, allStopsCatalog, nominatimResults, telemetry.lat, telemetry.lng]);

  const handleSelectItem = (item: SearchItem) => {
    setQuery(item.name);
    setIsOpen(false);

    // Find nearest DCE stop on current active route
    let nearestStop = selectedRoute.stops[0];
    let minDistance = Infinity;

    selectedRoute.stops.forEach((stop) => {
      const d = calculateDistanceMeters(item.lat, item.lng, stop.lat, stop.lng);
      if (d < minDistance) {
        minDistance = d;
        nearestStop = stop;
      }
    });

    setSelectedResult({
      name: item.name,
      subtitle: item.subtitle,
      lat: item.lat,
      lng: item.lng,
      nearestStop,
      distanceMeters: minDistance,
      stopId: item.stopId,
    });

    if (onSelectPlace) {
      onSelectPlace({ name: item.name, lat: item.lat, lng: item.lng });
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      
      {/* Search Input Box (Independent from Google Autocomplete DOM tampering) */}
      <div className="relative flex items-center group">
        <Search className="w-4 h-4 absolute left-3.5 text-cyan-400 pointer-events-none group-focus-within:scale-110 transition-transform" />
        
        <input
          type="text"
          value={query}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.trim().length > 0);
          }}
          placeholder="Search Chennai stops or landmarks (e.g. Tambaram, Guindy)..."
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs dark:bg-[#070B19]/90 bg-white/95 backdrop-blur-2xl border dark:border-white/15 border-slate-300 dark:text-white text-slate-800 placeholder-slate-400 outline-none focus:border-cyan-400 shadow-xl transition-all font-medium"
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSelectedResult(null);
              setIsOpen(false);
            }}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl dark:bg-[#070B19]/95 bg-white/95 border dark:border-white/15 border-slate-200 shadow-2xl backdrop-blur-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]">
          <div className="p-2 border-b dark:border-white/10 border-slate-200/80 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
            <span>Chennai Transit Suggestions</span>
            <span className="text-cyan-400 font-mono">{searchResults.length} Results</span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y dark:divide-white/5 divide-slate-100">
            {searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className="w-full p-2.5 px-3 flex items-start gap-2.5 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/15 text-left transition-colors group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110 shadow-sm dark:bg-white/5 bg-slate-100 text-cyan-400 border dark:border-white/10 border-slate-200">
                  {item.type === 'stop' ? (
                    <MapPin className="w-3.5 h-3.5" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-bold dark:text-white text-slate-900 truncate">
                      {item.name}
                    </h5>
                    {item.routeCode && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-cyan-500/15 text-cyan-400 border border-cyan-400/30">
                        {item.routeCode}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[10px] font-mono font-medium text-slate-400">
                    {formatDistance(item.distToBus)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Result Card with 1-Click Boarding */}
      {selectedResult && (
        <div className="absolute top-full left-0 right-0 mt-2 z-40 p-3.5 rounded-2xl dark:bg-[#070B19]/95 bg-white/95 border dark:border-white/15 border-slate-200 shadow-2xl backdrop-blur-2xl animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 border border-cyan-400/30">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black dark:text-white text-slate-900 leading-tight">
                  {selectedResult.name}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {selectedResult.subtitle}
                </p>
                
                {/* Nearest DCE Stop Connection */}
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span className="text-cyan-400 font-semibold">Nearest DCE Stop:</span>
                  <span className="font-bold dark:text-white text-slate-900">
                    {selectedResult.nearestStop.name}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    ({formatDistance(selectedResult.distanceMeters)} away)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => {
                  updateStudentStop(selectedResult.nearestStop.id);
                  setSelectedResult(null);
                }}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-cyan-500 text-black hover:bg-cyan-400 active:scale-95 transition-all shadow-md flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" />
                <span>Board Here</span>
              </button>

              <button
                onClick={() => setSelectedResult(null)}
                className="px-2 py-1 rounded-xl text-[9px] font-medium text-slate-400 hover:text-white transition-colors text-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
