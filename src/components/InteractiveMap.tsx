import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useBus } from '../context/BusContext';
import {
  Locate,
  Navigation,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDistance } from '../utils/geo';
import { StreetViewModal } from './StreetViewModal';
import { PlacesSearchBar } from './PlacesSearchBar';
import { getOsrmRoute } from '../services/osrm';
import type { BusStop } from '../types/bus';

interface InteractiveMapProps {
  className?: string;
  showControls?: boolean;
  expandedView?: boolean;
  onCardClick?: () => void;
  showPlacesSearch?: boolean;
}

// OpenFreeMap vector styles (OpenStreetMap data, zero API keys, GPU accelerated)
const OPENFREEMAP_DARK = 'https://tiles.openfreemap.org/styles/dark';
const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';

// Google Maps luxury styling
const GOOGLE_DARK_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#070B19' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#070B19' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7488a6' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#00F0FF' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8b9bb4' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#16234A' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1E3066' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#040814' }] },
];

const GOOGLE_LIGHT_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#F0F4F8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#BAE6FD' }] },
];

const InteractiveMapCore: React.FC<InteractiveMapProps> = ({
  className = '',
  showControls = true,
  onCardClick,
  showPlacesSearch = true,
}) => {
  const {
    selectedRoute,
    selectedBus,
    student,
    studentStop,
    telemetry,
    isDark,
    isSoundMuted,
    toggleSound,
    locationPermissionState,
    setIsLocationModalOpen,
  } = useBus();

  // Engine: Google Maps (Primary Default) | Leaflet (OSM Fallback) | MapLibre
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet' | 'maplibre'>(() => {
    if (typeof window !== 'undefined' && (window as any).googleMapsAuthFailed) {
      return 'leaflet';
    }
    return 'google';
  });
  const [googleAvailable, setGoogleAvailable] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      Boolean((window as any).google?.maps) &&
      !(window as any).googleMapsAuthFailed
    );
  });
  const [googleReady, setGoogleReady] = useState(false);
  const [streetViewStop, setStreetViewStop] = useState<BusStop | null>(null);

  // Containers
  const googleContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const maplibreContainerRef = useRef<HTMLDivElement | null>(null);

  // Google Maps refs
  const gMapInstanceRef = useRef<any>(null);
  const gBusMarkerRef = useRef<any>(null);
  const gStudentMarkerRef = useRef<any>(null);
  const gPolylineRef = useRef<any>(null);
  const gStopsMarkersRef = useRef<any[]>([]);

  // Leaflet refs
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const stopsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // MapLibre refs
  const mlMapInstanceRef = useRef<maplibregl.Map | null>(null);
  const mlBusMarkerRef = useRef<maplibregl.Marker | null>(null);
  const mlStudentMarkerRef = useRef<maplibregl.Marker | null>(null);
  const mlStopMarkersRef = useRef<maplibregl.Marker[]>([]);
  const mlBearingArrowRef = useRef<HTMLElement | null>(null);

  // Helper to destroy all Google Maps instances safely
  const destroyGoogleMap = useCallback(() => {
    try {
      if (gPolylineRef.current) gPolylineRef.current.setMap(null);
    } catch (_) {}
    try {
      if (gBusMarkerRef.current) gBusMarkerRef.current.setMap(null);
    } catch (_) {}
    try {
      if (gStudentMarkerRef.current) gStudentMarkerRef.current.setMap(null);
    } catch (_) {}
    try {
      gStopsMarkersRef.current.forEach((m) => {
        try {
          m?.setMap?.(null);
        } catch (_) {}
      });
    } catch (_) {}
    gPolylineRef.current = null;
    gBusMarkerRef.current = null;
    gStudentMarkerRef.current = null;
    gStopsMarkersRef.current = [];
    gMapInstanceRef.current = null;
  }, []);

  // Safe fallback handler when quota or auth fails
  const handleAuthFailure = useCallback(() => {
    console.warn('[Google Maps] Auth/quota error, falling back to Leaflet');
    if (typeof window !== 'undefined') {
      (window as any).googleMapsAuthFailed = true;
    }
    setGoogleAvailable(false);
    setGoogleReady(false);
    destroyGoogleMap();
    setMapEngine('leaflet');
  }, [destroyGoogleMap]);

  // Detect Google Maps availability and trigger initialization
  useEffect(() => {
    const checkGoogle = () => {
      const google = (window as any).google;
      if (google?.maps && !(window as any).googleMapsAuthFailed) {
        setGoogleAvailable(true);
        setGoogleReady(true);
      } else if ((window as any).googleMapsAuthFailed) {
        handleAuthFailure();
      }
    };
    checkGoogle();
    window.addEventListener('google-maps-ready', checkGoogle);

    const interval = setInterval(() => {
      if ((window as any).googleMapsAuthFailed) {
        handleAuthFailure();
        clearInterval(interval);
      } else if ((window as any).google?.maps) {
        checkGoogle();
        clearInterval(interval);
      }
    }, 200);

    window.addEventListener('google-maps-auth-failure', handleAuthFailure);

    // Timeout: if after 2s google maps hasn't loaded or failed, fallback to leaflet so map is never blank
    const fallbackTimer = setTimeout(() => {
      if (!(window as any).google?.maps || (window as any).googleMapsAuthFailed) {
        setMapEngine((prev) => (prev === 'google' ? 'leaflet' : prev));
      }
    }, 2000);

    return () => {
      window.removeEventListener('google-maps-ready', checkGoogle);
      window.removeEventListener('google-maps-auth-failure', handleAuthFailure);
      clearInterval(interval);
      clearTimeout(fallbackTimer);
    };
  }, [handleAuthFailure]);

  // Ensure Leaflet tiles immediately invalidate size when active
  useEffect(() => {
    if (mapEngine === 'leaflet' && mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 60);
      const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (mapEngine === 'maplibre' && mlMapInstanceRef.current) {
      try {
        mlMapInstanceRef.current.resize();
      } catch (_) {}
    }
  }, [mapEngine]);

  // Smooth position interpolation refs
  const currentPosRef = useRef<[number, number]>([telemetry.lat, telemetry.lng]);
  const targetPosRef = useRef<[number, number]>([telemetry.lat, telemetry.lng]);
  const animStartTimeRef = useRef<number>(0);
  const animDurationRef = useRef<number>(1000);
  const reqAnimRef = useRef<number | null>(null);

  const [followingBus, setFollowingBus] = useState(true);

  // =========================================================================
  // 1. MAPLIBRE GL JS INITIALIZATION (OpenFreeMap + OpenStreetMap Vector)
  // =========================================================================
  useEffect(() => {
    if (!maplibreContainerRef.current || mlMapInstanceRef.current) return;

    const styleUrl = isDark ? OPENFREEMAP_DARK : OPENFREEMAP_LIBERTY;

    const map = new maplibregl.Map({
      container: maplibreContainerRef.current,
      style: styleUrl,
      center: [telemetry.lng, telemetry.lat],
      zoom: 13.5,
      pitch: 25, // Subtle 3D perspective
      attributionControl: false,
    });

    mlMapInstanceRef.current = map;

    map.on('load', async () => {
      // Create Custom Bus Marker Element
      const busEl = document.createElement('div');
      busEl.className = 'bus-pin relative flex flex-col items-center select-none pointer-events-auto cursor-pointer';
      busEl.innerHTML = `
        <div class="absolute -top-1 w-12 h-12 bg-cyan-400/20 rounded-full animate-ping pointer-events-none"></div>
        <div class="relative z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-[#0B132B]/95 dark:bg-[#070B19]/95 border border-cyan-400/50 shadow-[0_8px_25px_rgba(6,182,212,0.5)] backdrop-blur-md">
          <span class="text-base leading-none">🚌</span>
          <div class="flex flex-col items-start leading-none">
            <span class="text-[11px] font-black text-white tracking-wider">${selectedBus.busNumber}</span>
            <span class="text-[9px] font-mono text-cyan-300 font-bold">${telemetry.speedKmh} km/h</span>
          </div>
          <div id="ml-bearing-arrow" class="w-3 h-3 text-cyan-400 transform" style="transform: rotate(${telemetry.bearing}deg)">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
          </div>
        </div>
        <div class="w-2.5 h-2.5 bg-[#0B132B] dark:bg-[#070B19] border-r border-b border-cyan-400/50 transform rotate-45 -mt-1 shadow-sm"></div>
      `;
      mlBearingArrowRef.current = busEl.querySelector('#ml-bearing-arrow');

      const busMarker = new maplibregl.Marker({ element: busEl, anchor: 'bottom' })
        .setLngLat([telemetry.lng, telemetry.lat])
        .addTo(map);
      mlBusMarkerRef.current = busMarker;

      // Create Custom Student Location Marker Element
      const studentEl = document.createElement('div');
      studentEl.className = 'student-pin relative flex flex-col items-center pointer-events-auto';
      studentEl.innerHTML = `
        <div class="absolute -top-1 w-10 h-10 bg-blue-500/30 rounded-full animate-ping"></div>
        <div class="relative z-10 px-2.5 py-1 rounded-xl bg-blue-600/90 text-white border border-white/40 shadow-lg text-[10px] font-black tracking-wider flex items-center gap-1">
          <span>📍 YOU</span>
        </div>
        <div class="w-2 h-2 bg-blue-600 border-r border-b border-white/40 transform rotate-45 -mt-1"></div>
      `;

      const studentMarker = new maplibregl.Marker({ element: studentEl, anchor: 'bottom' })
        .setLngLat([student.lng, student.lat])
        .addTo(map);
      mlStudentMarkerRef.current = studentMarker;

      // Load OSRM Route Geometry (or waypoints fallback)
      const waypointsLngLat = selectedRoute.waypoints.map(([lat, lng]) => [lng, lat]);
      let routeCoordinates = waypointsLngLat;

      // Attempt OSRM multi-stop road network calculation
      try {
        const osrm = await getOsrmRoute(
          selectedRoute.stops[0].lat,
          selectedRoute.stops[0].lng,
          selectedRoute.stops[selectedRoute.stops.length - 1].lat,
          selectedRoute.stops[selectedRoute.stops.length - 1].lng
        );
        if (osrm && osrm.geoJsonCoordinates.length > 0) {
          routeCoordinates = osrm.geoJsonCoordinates;
        }
      } catch {
        // Fallback to waypoints
      }

      // Add Route Polyline Source & Layers
      if (!map.getSource('dce-route')) {
        map.addSource('dce-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates,
            },
          },
        });

        // Glow layer
        map.addLayer({
          id: 'dce-route-glow',
          type: 'line',
          source: 'dce-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#00F0FF',
            'line-width': 8,
            'line-opacity': 0.35,
            'line-blur': 3,
          },
        });

        // Crisp inner line
        map.addLayer({
          id: 'dce-route-line',
          type: 'line',
          source: 'dce-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#00F0FF',
            'line-width': 3.5,
            'line-opacity': 0.9,
          },
        });
      }

      // Add Bus Stop Markers
      renderMapLibreStops(map);
    });

    return () => {
      map.remove();
      mlMapInstanceRef.current = null;
    };
  }, []);

  // Update MapLibre Style on Theme Change
  useEffect(() => {
    if (!mlMapInstanceRef.current) return;
    const styleUrl = isDark ? OPENFREEMAP_DARK : OPENFREEMAP_LIBERTY;
    mlMapInstanceRef.current.setStyle(styleUrl);
  }, [isDark]);

  // Render MapLibre Stops
  const renderMapLibreStops = (map: maplibregl.Map) => {
    // Clear old stops
    mlStopMarkersRef.current.forEach((m) => m.remove());
    mlStopMarkersRef.current = [];

    selectedRoute.stops.forEach((stop, index) => {
      const isStudentStop = stop.id === studentStop.id;
      const isTerminal = stop.isTerminal;

      const stopEl = document.createElement('div');
      stopEl.className = 'relative flex flex-col items-center group cursor-pointer';
      stopEl.innerHTML = `
        <div class="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border-2 transition-transform duration-200 group-hover:scale-125 ${
          isStudentStop
            ? 'bg-blue-500 border-white text-white shadow-[0_0_15px_rgba(59,130,246,0.8)]'
            : isTerminal
            ? 'bg-emerald-500 border-white text-white shadow-md'
            : 'bg-[#0B132B] dark:bg-[#070B19] border-cyan-400 text-cyan-300 shadow-sm'
        }">
          ${index + 1}
        </div>
        <div class="mt-1 px-2 py-0.5 rounded-md bg-[#0B132B]/90 dark:bg-[#070B19]/90 border border-white/10 text-[9px] font-semibold text-white whitespace-nowrap shadow-md pointer-events-none">
          ${stop.shortName}
        </div>
      `;

      stopEl.addEventListener('click', () => {
        setStreetViewStop(stop);
      });

      const marker = new maplibregl.Marker({ element: stopEl, anchor: 'center' })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);

      mlStopMarkersRef.current.push(marker);
    });
  };

  // Update MapLibre route when selectedRoute changes
  useEffect(() => {
    const map = mlMapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    renderMapLibreStops(map);

    const source = map.getSource('dce-route') as maplibregl.GeoJSONSource;
    if (source) {
      const waypointsLngLat = selectedRoute.waypoints.map(([lat, lng]) => [lng, lat]);
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: waypointsLngLat,
        },
      });
    }
  }, [selectedRoute, studentStop]);

  // =========================================================================
  // 2. LEAFLET FALLBACK INITIALIZATION
  // =========================================================================
  const updateTileTheme = useCallback((map: L.Map, dark: boolean) => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const tileUrl = dark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const newLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; CartoDB & OpenStreetMap contributors',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, []);

  useEffect(() => {
    if (!leafletContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(leafletContainerRef.current, {
      center: [telemetry.lat, telemetry.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;
    updateTileTheme(map, isDark);
    stopsLayerGroupRef.current = L.layerGroup().addTo(map);

    const busIcon = L.divIcon({
      className: 'custom-bus-marker-container',
      html: `
        <div class="bus-pin relative flex flex-col items-center select-none pointer-events-auto">
          <div class="absolute -top-1 w-12 h-12 bg-cyan-400/20 rounded-full animate-ping pointer-events-none"></div>
          <div class="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#0B132B]/90 dark:bg-[#070B19]/90 border border-cyan-400/50 shadow-[0_8px_25px_rgba(6,182,212,0.45)] backdrop-blur-md">
            <span class="text-base">🚌</span>
            <div class="flex flex-col items-start leading-none">
              <span class="text-[11px] font-black text-white tracking-wider">${selectedBus.busNumber}</span>
              <span class="text-[9px] font-mono text-cyan-300 font-bold">${telemetry.speedKmh} km/h</span>
            </div>
            <div id="bus-bearing-arrow" class="w-3 h-3 text-cyan-400 transform" style="transform: rotate(${telemetry.bearing}deg)">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
            </div>
          </div>
          <div class="w-2.5 h-2.5 bg-[#0B132B] dark:bg-[#070B19] border-r border-b border-cyan-400/50 transform rotate-45 -mt-1 shadow-sm"></div>
        </div>
      `,
      iconSize: [110, 48],
      iconAnchor: [55, 48],
    });

    const busMarker = L.marker([telemetry.lat, telemetry.lng], { icon: busIcon, zIndexOffset: 1000 }).addTo(map);
    busMarkerRef.current = busMarker;

    const studentIcon = L.divIcon({
      className: 'custom-student-marker',
      html: `
        <div class="student-pin relative flex flex-col items-center pointer-events-auto">
          <div class="absolute -top-1 w-10 h-10 bg-blue-500/30 rounded-full animate-ping"></div>
          <div class="relative z-10 px-2.5 py-1 rounded-xl bg-blue-600/90 text-white border border-white/40 shadow-lg text-[10px] font-black tracking-wider flex items-center gap-1">
            <span>📍 YOU</span>
          </div>
          <div class="w-2 h-2 bg-blue-600 border-r border-b border-white/40 transform rotate-45 -mt-1"></div>
        </div>
      `,
      iconSize: [60, 36],
      iconAnchor: [30, 36],
    });

    const studentMarker = L.marker([student.lat, student.lng], { icon: studentIcon, zIndexOffset: 500 }).addTo(map);
    studentMarkerRef.current = studentMarker;

    // Add Route Polyline to Leaflet
    L.polyline(selectedRoute.waypoints, {
      color: '#00F0FF',
      weight: 7,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    L.polyline(selectedRoute.waypoints, {
      color: '#00F0FF',
      weight: 3.5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Add Stops to Leaflet
    selectedRoute.stops.forEach((stop, index) => {
      const isStudentStop = stop.id === studentStop.id;
      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer">
            <div class="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border-2 ${
              isStudentStop
                ? 'bg-blue-500 border-white text-white shadow-lg scale-110'
                : stop.isTerminal
                ? 'bg-emerald-500 border-white text-white shadow-md'
                : 'bg-[#0B132B] dark:bg-[#070B19] border-cyan-400 text-cyan-300'
            }">
              ${index + 1}
            </div>
            <div class="mt-1 px-1.5 py-0.5 rounded bg-[#0B132B]/90 text-[9px] font-semibold text-white whitespace-nowrap shadow-sm pointer-events-none">
              ${stop.shortName}
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(stopsLayerGroupRef.current!);
      marker.on('click', () => setStreetViewStop(stop));
    });
  }, [selectedRoute, studentStop]);

  // =========================================================================
  // 3. GOOGLE MAPS ENGINE INITIALIZATION (Google Maps API + Key)
  // =========================================================================
  const renderGoogleStops = useCallback((map: any) => {
    try {
      const google = (window as any).google;
      if (!google?.maps || (window as any).googleMapsAuthFailed) return;

      gStopsMarkersRef.current.forEach((m) => {
        try {
          m?.setMap?.(null);
        } catch (_) {}
      });
      gStopsMarkersRef.current = [];

      selectedRoute.stops.forEach((stop, index) => {
        const isStudentStop = stop.id === studentStop.id;
        const marker = new google.maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map,
          title: `${stop.shortName} (#${index + 1})`,
          label: {
            text: String(index + 1),
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 'bold',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: isStudentStop ? '#3B82F6' : stop.isTerminal ? '#10B981' : '#0B132B',
            fillOpacity: 1,
            strokeColor: isStudentStop ? '#60A5FA' : '#00F0FF',
            strokeWeight: 2,
          },
        });

        marker.addListener('click', () => {
          setStreetViewStop(stop);
        });

        gStopsMarkersRef.current.push(marker);
      });
    } catch (err) {
      console.warn('[Google Maps] renderGoogleStops error, switching to Leaflet:', err);
      handleAuthFailure();
    }
  }, [selectedRoute, studentStop, handleAuthFailure]);

  useEffect(() => {
    if (mapEngine !== 'google' || !googleContainerRef.current) return;
    if (typeof window !== 'undefined' && (window as any).googleMapsAuthFailed) {
      setMapEngine('leaflet');
      return;
    }
    const google = (window as any).google;
    if (!google?.maps) return;

    if (!gMapInstanceRef.current) {
      try {
        const gMap = new google.maps.Map(googleContainerRef.current, {
          center: { lat: telemetry.lat, lng: telemetry.lng },
          zoom: 14,
          styles: isDark ? GOOGLE_DARK_STYLES : GOOGLE_LIGHT_STYLES,
          disableDefaultUI: true,
          zoomControl: false,
        });
        gMapInstanceRef.current = gMap;

        const busMarker = new google.maps.Marker({
          position: { lat: telemetry.lat, lng: telemetry.lng },
          map: gMap,
          title: `Bus ${selectedBus.busNumber}`,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: '#00F0FF',
            fillOpacity: 1,
            strokeColor: '#070B19',
            strokeWeight: 2,
            rotation: telemetry.bearing,
          },
        });
        gBusMarkerRef.current = busMarker;

        const studentMarker = new google.maps.Marker({
          position: { lat: student.lat, lng: student.lng },
          map: gMap,
          title: 'You',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });
        gStudentMarkerRef.current = studentMarker;

        const path = selectedRoute.waypoints.map(([lat, lng]) => ({ lat, lng }));
        const poly = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#00F0FF',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map: gMap,
        });
        gPolylineRef.current = poly;

        renderGoogleStops(gMap);
      } catch (err) {
        console.warn('[Google Maps] Fallback to Leaflet:', err);
        handleAuthFailure();
      }
    }
  }, [mapEngine, googleReady, renderGoogleStops, selectedBus, student, selectedRoute, handleAuthFailure, isDark, telemetry.lat, telemetry.lng, telemetry.bearing]);

  // Update Google Maps Theme
  useEffect(() => {
    if (gMapInstanceRef.current) {
      try {
        gMapInstanceRef.current.setOptions({
          styles: isDark ? GOOGLE_DARK_STYLES : GOOGLE_LIGHT_STYLES,
        });
      } catch (_) {
        handleAuthFailure();
      }
    }
  }, [isDark, handleAuthFailure]);

  // Update Google Maps Route and Stops when route changes
  useEffect(() => {
    if (gMapInstanceRef.current) {
      try {
        if (gPolylineRef.current) {
          const path = selectedRoute.waypoints.map(([lat, lng]) => ({ lat, lng }));
          gPolylineRef.current.setPath(path);
        }
        renderGoogleStops(gMapInstanceRef.current);
      } catch (_) {
        handleAuthFailure();
      }
    }
  }, [selectedRoute, renderGoogleStops, handleAuthFailure]);

  // Update Student Pin across all map engines when real GPS coordinates arrive
  useEffect(() => {
    // 1. Google Maps
    if (gStudentMarkerRef.current) {
      try {
        gStudentMarkerRef.current.setPosition({ lat: student.lat, lng: student.lng });
      } catch (_) {}
    }
    // 2. Leaflet
    if (studentMarkerRef.current) {
      try {
        studentMarkerRef.current.setLatLng([student.lat, student.lng]);
      } catch (_) {}
    }
    // 3. MapLibre
    if (mlStudentMarkerRef.current) {
      try {
        mlStudentMarkerRef.current.setLngLat([student.lng, student.lat]);
      } catch (_) {}
    }
  }, [student.lat, student.lng]);

  // Keep Leaflet tiles and Google Maps fitted and prevent blank canvas on resize / tab switch
  useEffect(() => {
    const handleResize = () => {
      try {
        if (mapEngine === 'leaflet' && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        } else if (mapEngine === 'google' && gMapInstanceRef.current) {
          const google = (window as any).google;
          if (google?.maps && !(window as any).googleMapsAuthFailed) {
            google.maps.event.trigger(gMapInstanceRef.current, 'resize');
          }
        } else if (mapEngine === 'maplibre' && mlMapInstanceRef.current) {
          mlMapInstanceRef.current.resize();
        }
      } catch (_) {}
    };

    handleResize();
    const t = setTimeout(handleResize, 150);
    window.addEventListener('resize', handleResize);

    const container = googleContainerRef.current?.parentElement;
    let observer: ResizeObserver | null = null;
    if (container && window.ResizeObserver) {
      observer = new ResizeObserver(() => handleResize());
      observer.observe(container);
    }

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [mapEngine]);

  // Google Maps cleanup
  useEffect(() => {
    return () => {
      destroyGoogleMap();
    };
  }, [destroyGoogleMap]);

  // =========================================================================
  // 4. SILKY SMOOTH BUS MOVEMENT (60 FPS interpolation across all engines)
  // =========================================================================
  useEffect(() => {
    const startPos = currentPosRef.current;
    const targetPos: [number, number] = [telemetry.lat, telemetry.lng];

    if (startPos[0] === targetPos[0] && startPos[1] === targetPos[1]) return;

    targetPosRef.current = targetPos;
    animStartTimeRef.current = performance.now();
    animDurationRef.current = 1000;

    if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);

    const animateMovement = (currentTime: number) => {
      const elapsed = currentTime - animStartTimeRef.current;
      const progress = Math.min(elapsed / animDurationRef.current, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const interpolatedLat = startPos[0] + (targetPos[0] - startPos[0]) * ease;
      const interpolatedLng = startPos[1] + (targetPos[1] - startPos[1]) * ease;
      const currentInterpolated: [number, number] = [interpolatedLat, interpolatedLng];

      currentPosRef.current = currentInterpolated;

      // 1. Update MapLibre Marker
      if (mlBusMarkerRef.current) {
        try {
          mlBusMarkerRef.current.setLngLat([interpolatedLng, interpolatedLat]);
          if (mlBearingArrowRef.current) {
            mlBearingArrowRef.current.style.transform = `rotate(${telemetry.bearing}deg)`;
          }
        } catch (_) {}
      }

      // 2. Update Leaflet Marker
      if (busMarkerRef.current) {
        try {
          busMarkerRef.current.setLatLng(currentInterpolated);
          const arrow = document.getElementById('bus-bearing-arrow');
          if (arrow) arrow.style.transform = `rotate(${telemetry.bearing}deg)`;
        } catch (_) {}
      }

      // 3. Update Google Maps Marker
      if (gBusMarkerRef.current) {
        try {
          const google = (window as any).google;
          if (google?.maps && !(window as any).googleMapsAuthFailed) {
            gBusMarkerRef.current.setPosition({ lat: interpolatedLat, lng: interpolatedLng });
            const icon = gBusMarkerRef.current.getIcon();
            if (icon && typeof icon === 'object' && icon.rotation !== telemetry.bearing) {
              gBusMarkerRef.current.setIcon({ ...icon, rotation: telemetry.bearing });
            }
          }
        } catch (_) {}
      }

      // 4. Camera pan
      if (followingBus) {
        try {
          if (mapEngine === 'maplibre' && mlMapInstanceRef.current) {
            mlMapInstanceRef.current.easeTo({
              center: [interpolatedLng, interpolatedLat],
              duration: 800,
            });
          } else if (mapEngine === 'leaflet' && mapInstanceRef.current) {
            mapInstanceRef.current.panTo(currentInterpolated, { animate: true, duration: 0.8 });
          } else if (mapEngine === 'google' && gMapInstanceRef.current) {
            gMapInstanceRef.current.panTo({ lat: interpolatedLat, lng: interpolatedLng });
          }
        } catch (_) {}
      }

      if (progress < 1) {
        reqAnimRef.current = requestAnimationFrame(animateMovement);
      }
    };

    reqAnimRef.current = requestAnimationFrame(animateMovement);

    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
    };
  }, [telemetry.lat, telemetry.lng, telemetry.bearing, followingBus, mapEngine]);

  // Recenter controls
  const handleRecenterBus = () => {
    setFollowingBus(true);
    try {
      if (mapEngine === 'maplibre' && mlMapInstanceRef.current) {
        mlMapInstanceRef.current.flyTo({
          center: [telemetry.lng, telemetry.lat],
          zoom: 14.5,
          duration: 1000,
        });
      } else if (mapEngine === 'leaflet' && mapInstanceRef.current) {
        mapInstanceRef.current.setView([telemetry.lat, telemetry.lng], 15, { animate: true });
      } else if (mapEngine === 'google' && gMapInstanceRef.current) {
        gMapInstanceRef.current.panTo({ lat: telemetry.lat, lng: telemetry.lng });
        gMapInstanceRef.current.setZoom(15);
      }
    } catch (_) {
      handleAuthFailure();
    }
  };

  const handleRecenterStudent = () => {
    if (locationPermissionState !== 'granted') {
      setIsLocationModalOpen(true);
    }
    setFollowingBus(false);
    try {
      if (mapEngine === 'maplibre' && mlMapInstanceRef.current) {
        mlMapInstanceRef.current.flyTo({
          center: [student.lng, student.lat],
          zoom: 15,
          duration: 1000,
        });
      } else if (mapEngine === 'leaflet' && mapInstanceRef.current) {
        mapInstanceRef.current.setView([student.lat, student.lng], 16, { animate: true });
      } else if (mapEngine === 'google' && gMapInstanceRef.current) {
        gMapInstanceRef.current.panTo({ lat: student.lat, lng: student.lng });
        gMapInstanceRef.current.setZoom(16);
      }
    } catch (_) {
      handleAuthFailure();
    }
  };

  const handleFitRoute = () => {
    setFollowingBus(false);
    try {
      if (mapEngine === 'maplibre' && mlMapInstanceRef.current) {
        const bounds = new maplibregl.LngLatBounds();
        selectedRoute.waypoints.forEach(([lat, lng]) => bounds.extend([lng, lat]));
        mlMapInstanceRef.current.fitBounds(bounds, { padding: 40, duration: 1200 });
      } else if (mapEngine === 'leaflet' && mapInstanceRef.current) {
        const bounds = L.latLngBounds(selectedRoute.waypoints);
        mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
      } else if (mapEngine === 'google' && gMapInstanceRef.current) {
        const google = (window as any).google;
        if (google?.maps && !(window as any).googleMapsAuthFailed) {
          const bounds = new google.maps.LatLngBounds();
          selectedRoute.waypoints.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
          gMapInstanceRef.current.fitBounds(bounds);
        }
      }
    } catch (_) {
      handleAuthFailure();
    }
  };

  const handleZoomIn = () => {
    try {
      if (mapEngine === 'maplibre' && mlMapInstanceRef.current) {
        mlMapInstanceRef.current.zoomIn();
      } else if (mapEngine === 'leaflet' && mapInstanceRef.current) {
        mapInstanceRef.current.zoomIn();
      } else if (mapEngine === 'google' && gMapInstanceRef.current) {
        gMapInstanceRef.current.setZoom((gMapInstanceRef.current.getZoom() || 14) + 1);
      }
    } catch (_) {
      handleAuthFailure();
    }
  };

  const handleZoomOut = () => {
    try {
      if (mapEngine === 'maplibre' && mlMapInstanceRef.current) {
        mlMapInstanceRef.current.zoomOut();
      } else if (mapEngine === 'leaflet' && mapInstanceRef.current) {
        mapInstanceRef.current.zoomOut();
      } else if (mapEngine === 'google' && gMapInstanceRef.current) {
        gMapInstanceRef.current.setZoom((gMapInstanceRef.current.getZoom() || 14) - 1);
      }
    } catch (_) {
      handleAuthFailure();
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      
      {/* 1. Google Maps Layer (Google Maps Platform API key AIzaSyAOVYRIgupAurZup5y1PRh8Ismb1A3lLao) */}
      <div
        ref={googleContainerRef}
        className={`w-full h-full absolute inset-0 z-0 outline-none transition-opacity duration-300 ${
          mapEngine === 'google' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 2. Leaflet Vector Layer (Instant 100% Reliable Fallback) */}
      <div
        ref={leafletContainerRef}
        className={`w-full h-full absolute inset-0 z-0 cursor-grab active:cursor-grabbing outline-none transition-opacity duration-300 ${
          mapEngine === 'leaflet' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 3. MapLibre GL JS Layer */}
      <div
        ref={maplibreContainerRef}
        className={`w-full h-full absolute inset-0 z-0 outline-none transition-opacity duration-300 ${
          mapEngine === 'maplibre' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Floating Google Places / OpenStreetMap Search Bar (Desktop/Tablet Top Center) */}
      {showPlacesSearch && (
        <div className="hidden sm:block absolute top-4 left-4 right-16 sm:left-44 sm:right-44 z-[35] pointer-events-auto max-w-sm">
          <PlacesSearchBar
            onSelectPlace={(place) => {
              if (mapEngine === 'google' && gMapInstanceRef.current) {
                gMapInstanceRef.current.panTo({ lat: place.lat, lng: place.lng });
                gMapInstanceRef.current.setZoom(16);
              } else if (mapEngine === 'leaflet' && mapInstanceRef.current) {
                mapInstanceRef.current.setView([place.lat, place.lng], 16, { animate: true });
              } else if (mapEngine === 'maplibre' && mlMapInstanceRef.current) {
                mlMapInstanceRef.current.flyTo({ center: [place.lng, place.lat], zoom: 15.5 });
              }
            }}
          />
        </div>
      )}

      {/* Floating Speed & Telemetry Quick Capsule (Desktop only) */}
      <div className="hidden sm:flex absolute top-4 left-4 z-[30] pointer-events-none items-center gap-2">
        <div className="px-3.5 py-1.5 rounded-full backdrop-blur-xl bg-slate-900/80 dark:bg-[#070B19]/80 border border-white/15 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.35)] flex items-center gap-2 text-xs font-semibold text-white">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono text-cyan-400">{telemetry.speedKmh} km/h</span>
          <span className="text-white/40">•</span>
          <span className="font-mono text-slate-300">{formatDistance(telemetry.distanceToStudentStopMeters)}</span>
        </div>
      </div>

      {/* Floating Map Navigation Controls (Top Right) */}
      {showControls && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[30] flex flex-col gap-2">
          
          {/* Audio Mute/Unmute Toggle (Desktop & Mobile) */}
          <button
            onClick={toggleSound}
            title={isSoundMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border active:scale-90 transition-all shadow-lg ${
              isSoundMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400 hover:bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
            }`}
            aria-label={isSoundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isSoundMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
            )}
          </button>

          {/* Map Engine Switcher (Google Maps / Leaflet) */}
          <button
            onClick={() => {
              if (mapEngine === 'google') {
                setMapEngine('leaflet');
              } else if (mapEngine === 'leaflet') {
                setMapEngine(googleAvailable ? 'google' : 'maplibre');
              } else {
                setMapEngine('google');
              }
            }}
            title={`Switch Map (Current: ${mapEngine === 'google' ? 'Google Maps' : mapEngine === 'leaflet' ? 'Leaflet OSM' : 'MapLibre'})`}
            className="px-2 sm:px-2.5 py-1.5 rounded-2xl flex items-center gap-1.5 backdrop-blur-xl bg-slate-900/85 dark:bg-[#070B19]/85 text-white border border-cyan-400/40 hover:bg-white/15 active:scale-95 transition-all shadow-lg text-[10px] font-bold"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {mapEngine === 'google' ? 'Google Maps' : 'Leaflet OSM'}
            </span>
          </button>

          {/* Recenter Bus (Always available on mobile & desktop) */}
          <button
            onClick={handleRecenterBus}
            title="Track Bus"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all duration-200 active:scale-90 shadow-lg ${
              followingBus
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                : 'bg-slate-900/80 dark:bg-[#070B19]/80 text-white border-white/15 hover:bg-white/15'
            }`}
          >
            <Navigation className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Recenter Student (Desktop/Tablet) */}
          <button
            onClick={handleRecenterStudent}
            title="My Location (Stop)"
            className="hidden sm:flex w-10 h-10 rounded-2xl items-center justify-center backdrop-blur-xl bg-slate-900/80 dark:bg-[#070B19]/80 text-white border border-white/15 hover:bg-white/15 transition-all duration-200 active:scale-90 shadow-lg"
          >
            <Locate className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Fit Full Route (Desktop/Tablet) */}
          <button
            onClick={handleFitRoute}
            title="Fit Entire Route"
            className="hidden sm:flex w-10 h-10 rounded-2xl items-center justify-center backdrop-blur-xl bg-slate-900/80 dark:bg-[#070B19]/80 text-white border border-white/15 hover:bg-white/15 transition-all duration-200 active:scale-90 shadow-lg"
          >
            <Maximize2 className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Zoom In (Desktop only - mobile uses pinch to zoom) */}
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="hidden sm:flex w-10 h-10 rounded-2xl items-center justify-center backdrop-blur-xl bg-slate-900/80 dark:bg-[#070B19]/80 text-white border border-white/15 hover:bg-white/15 transition-all duration-200 active:scale-90 shadow-lg"
          >
            <ZoomIn className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Zoom Out (Desktop only - mobile uses pinch to zoom) */}
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="hidden sm:flex w-10 h-10 rounded-2xl items-center justify-center backdrop-blur-xl bg-slate-900/80 dark:bg-[#070B19]/80 text-white border border-white/15 hover:bg-white/15 transition-all duration-200 active:scale-90 shadow-lg"
          >
            <ZoomOut className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Google Street View 360° Panorama Modal */}
      {streetViewStop && (
        <StreetViewModal
          stop={streetViewStop}
          onClose={() => setStreetViewStop(null)}
        />
      )}

      {/* Expand to Live Screen Overlay Touch (when in preview mode) */}
      {onCardClick && (
        <div
          onClick={onCardClick}
          className="absolute inset-0 z-[20] cursor-pointer bg-transparent"
        />
      )}
    </div>
  );
};

interface MapErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends React.Component<InteractiveMapProps, MapErrorBoundaryState> {
  constructor(props: InteractiveMapProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('[InteractiveMap] Error boundary caught script error, auto-recovering with Leaflet:', error);
    if (typeof window !== 'undefined') {
      (window as any).googleMapsAuthFailed = true;
    }
    // Auto-recover after flagging auth failure so Leaflet renders cleanly
    setTimeout(() => {
      this.setState({ hasError: false });
    }, 50);
  }

  render() {
    return <InteractiveMapCore {...this.props} />;
  }
}

export const InteractiveMap: React.FC<InteractiveMapProps> = (props) => {
  return (
    <MapErrorBoundary {...props}>
      <InteractiveMapCore {...props} />
    </MapErrorBoundary>
  );
};
