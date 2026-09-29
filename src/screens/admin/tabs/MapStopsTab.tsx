import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { BusRoute, BusStop } from '../../../types/bus';
import { busApiService } from '../../../services/busApiService';
import { sound } from '../../../utils/sound';
import { MapPin, Search, Trash2, CheckCircle, X, Move } from 'lucide-react';

interface MapStopsTabProps {
  routes: BusRoute[];
  stops: BusStop[];
  onRefresh: () => void;
}

export const MapStopsTab: React.FC<MapStopsTabProps> = ({ routes, stops, onRefresh }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const activeDraftMarkerRef = useRef<L.Marker | null>(null);

  const [selectedRouteId, setSelectedRouteId] = useState<string>('ALL');
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Stop Form State
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    lat: 12.9249,
    lng: 80.1165,
    routeId: routes[0]?.id || 'route-07',
    sequence: 1,
    scheduledTime: '07:30 AM',
    studentsWaiting: 15,
    isTerminal: false,
  });

  // Filtered stops
  const displayedStops = selectedRouteId === 'ALL'
    ? stops
    : stops.filter(s => s.routeId === selectedRouteId);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Tambaram / DCE Chennai region
    const map = L.map(mapContainerRef.current, {
      center: [12.9249, 80.1165],
      zoom: 12,
      zoomControl: false,
    });

    // Dark Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Map Click Listener to drop pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(5));
      const lng = parseFloat(e.latlng.lng.toFixed(5));
      sound.playClick();

      setFormData(prev => ({
        ...prev,
        lat,
        lng,
      }));

      // Update or drop draft marker
      if (activeDraftMarkerRef.current) {
        activeDraftMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const pinIcon = L.divIcon({
          className: 'custom-draft-pin',
          html: `<div style="background:#06B6D4; width:28px; height:28px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 0 15px #06B6D4; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:12px;">📍</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const draftMarker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
        draftMarker.on('dragend', () => {
          const pos = draftMarker.getLatLng();
          setFormData(prev => ({
            ...prev,
            lat: parseFloat(pos.lat.toFixed(5)),
            lng: parseFloat(pos.lng.toFixed(5)),
          }));
        });
        activeDraftMarkerRef.current = draftMarker;
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync existing markers onto map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    displayedStops.forEach(stop => {
      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: `
          <div style="background:${stop.isTerminal ? '#F43F5E' : '#10B981'}; width:26px; height:26px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 12px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:800; font-size:10px;">
            ${stop.sequence || '•'}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([stop.lat, stop.lng], {
        draggable: true,
        icon: stopIcon,
      }).addTo(map);

      // Tooltip
      marker.bindTooltip(`<b>${stop.name}</b><br/>Sequence #${stop.sequence || 1}`, {
        permanent: false,
        direction: 'top',
      });

      // Click to select & edit
      marker.on('click', () => {
        sound.playClick();
        setEditingStopId(stop.id);
        setFormData({
          name: stop.name,
          shortName: stop.shortName || stop.name.split(' ')[0],
          lat: stop.lat,
          lng: stop.lng,
          routeId: stop.routeId || routes[0]?.id || 'route-07',
          sequence: stop.sequence || 1,
          scheduledTime: stop.scheduledTime || '07:30 AM',
          studentsWaiting: stop.studentsWaiting || 0,
          isTerminal: Boolean(stop.isTerminal),
        });
      });

      // Draggable marker support
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const updatedLat = parseFloat(pos.lat.toFixed(5));
        const updatedLng = parseFloat(pos.lng.toFixed(5));

        sound.playClick();
        setFormData(prev => ({ ...prev, lat: updatedLat, lng: updatedLng }));

        try {
          await busApiService.updateStop(stop.id, { lat: updatedLat, lng: updatedLng });
          setStatusMessage(`Coordinates for "${stop.name}" updated to [${updatedLat}, ${updatedLng}]. Synced to APK.`);
          onRefresh();
          setTimeout(() => setStatusMessage(null), 3500);
        } catch (e: any) {
          console.error(e);
        }
      });

      markersRef.current.set(stop.id, marker);
    });
  }, [displayedStops, routes]);

  // Geocoding Search
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchLocation.trim()) return;

    setIsSearching(true);
    sound.playClick();

    try {
      const q = encodeURIComponent(`${searchLocation.trim()}, Chennai, Tamil Nadu, India`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(parseFloat(data[0].lat).toFixed(5));
        const lng = parseFloat(parseFloat(data[0].lon).toFixed(5));

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
        }

        setFormData(prev => ({
          ...prev,
          name: prev.name || searchLocation.trim(),
          lat,
          lng,
        }));

        sound.playSuccess();
      } else {
        alert('Location not found. Please click anywhere on the map to set coordinates manually.');
      }
    } catch {
      alert('Unable to perform search query. You can click directly on the map to place the marker.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    sound.playClick();
    try {
      if (editingStopId) {
        await busApiService.updateStop(editingStopId, formData);
        setStatusMessage(`Stop "${formData.name}" updated successfully.`);
      } else {
        await busApiService.addStop(formData);
        setStatusMessage(`New stop "${formData.name}" added to route and synced to Web and APK.`);
      }

      sound.playSuccess();
      setEditingStopId(null);
      // Remove draft marker
      if (activeDraftMarkerRef.current) {
        activeDraftMarkerRef.current.remove();
        activeDraftMarkerRef.current = null;
      }
      onRefresh();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Error saving stop: ${err.message}`);
    }
  };

  const handleDeleteStop = async () => {
    if (!editingStopId) return;
    if (!window.confirm(`Delete stop "${formData.name}"?`)) return;

    sound.playClick();
    try {
      await busApiService.deleteStop(editingStopId);
      sound.playSuccess();
      setStatusMessage(`Stop deleted.`);
      setEditingStopId(null);
      onRefresh();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(`Error deleting stop: ${err.message}`);
    }
  };

  const handleResetForm = () => {
    setEditingStopId(null);
    setFormData({
      name: '',
      shortName: '',
      lat: 12.9249,
      lng: 80.1165,
      routeId: routes[0]?.id || 'route-07',
      sequence: stops.length + 1,
      scheduledTime: '07:30 AM',
      studentsWaiting: 15,
      isTerminal: false,
    });
    if (activeDraftMarkerRef.current) {
      activeDraftMarkerRef.current.remove();
      activeDraftMarkerRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Status banner */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <span>Interactive Map & Stop Location Manager</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click on map to position pin, or drag existing markers to update GPS coordinates in real-time.
          </p>
        </div>

        {/* Location Search Form */}
        <form onSubmit={handleSearchLocation} className="flex items-center gap-2 w-full lg:w-96">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Chennai area (e.g. Tambaram, Guindy)..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isSearching ? 'Locating...' : 'Locate'}
          </button>
        </form>
      </div>

      {/* Route Filter Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedRouteId('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            selectedRouteId === 'ALL'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          All Routes ({stops.length} Stops)
        </button>
        {routes.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRouteId(r.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedRouteId === r.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Map & Form Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Map Container (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 overflow-hidden relative shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-[#070B19]">
          <div ref={mapContainerRef} className="w-full h-[520px] z-10" />

          {/* Floating Instructions Pill */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none backdrop-blur-md bg-black/75 px-3 py-1.5 rounded-xl border border-white/15 text-[11px] text-slate-200 flex items-center gap-2 shadow-lg">
            <Move className="w-3.5 h-3.5 text-cyan-400" />
            <span>Click map to place pin • Drag any marker to adjust</span>
          </div>
        </div>

        {/* Stop Configuration Form (1 col) */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>{editingStopId ? 'Edit Selected Stop' : 'Deploy New Bus Stop'}</span>
            </h3>
            {editingStopId && (
              <button
                onClick={handleResetForm}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                + New Stop
              </button>
            )}
          </div>

          <form onSubmit={handleSaveStop} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Stop Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tambaram West Stand"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-white font-medium focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Short Name / Code
              </label>
              <input
                type="text"
                placeholder="Tambaram"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.00001"
                  required
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-cyan-400 font-mono font-bold focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.00001"
                  required
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-cyan-400 font-mono font-bold focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Assign to Route
              </label>
              <select
                value={formData.routeId}
                onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
              >
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Sequence Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.sequence}
                  onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Scheduled Time
                </label>
                <input
                  type="text"
                  placeholder="07:45 AM"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={formData.isTerminal}
                  onChange={(e) => setFormData({ ...formData, isTerminal: e.target.checked })}
                  className="rounded border-slate-700 text-rose-500 focus:ring-rose-400"
                />
                <span>Terminal / Campus End Station</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-white/10">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95"
              >
                {editingStopId ? 'Update Stop' : 'Deploy Stop'}
              </button>

              {editingStopId && (
                <button
                  type="button"
                  onClick={handleDeleteStop}
                  className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                  title="Delete Stop"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

        </div>

      </div>

    </div>
  );
};
