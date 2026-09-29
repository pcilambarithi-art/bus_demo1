import React, { useState } from 'react';
import type { BusRoute } from '../../../types/bus';
import { busApiService } from '../../../services/busApiService';
import { sound } from '../../../utils/sound';
import { Route, Plus, Edit2, ArrowDown, ArrowUp, Trash2, MapPin, CheckCircle, Clock, X } from 'lucide-react';

interface RoutesTabProps {
  routes: BusRoute[];
  onRefresh: () => void;
}

export const RoutesTab: React.FC<RoutesTabProps> = ({ routes, onRefresh }) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || 'route-07');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

  // Route Form State
  const [routeFormData, setRouteFormData] = useState({
    name: '',
    code: '',
    routeNumber: '',
    origin: '',
    destination: '',
    description: '',
    totalDistanceKm: 15,
    estimatedTotalMinutes: 35,
  });

  const handleOpenAddRoute = () => {
    sound.playClick();
    setRouteFormData({
      name: '',
      code: `R-${routes.length + 1}`,
      routeNumber: `${routes.length + 1}`,
      origin: '',
      destination: 'DCE Campus, Manimangalam',
      description: '',
      totalDistanceKm: 18,
      estimatedTotalMinutes: 40,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditRoute = () => {
    sound.playClick();
    if (!activeRoute) return;
    setRouteFormData({
      name: activeRoute.name,
      code: activeRoute.code,
      routeNumber: activeRoute.routeNumber || activeRoute.code.replace('R-', ''),
      origin: activeRoute.origin,
      destination: activeRoute.destination,
      description: activeRoute.description || '',
      totalDistanceKm: activeRoute.totalDistanceKm,
      estimatedTotalMinutes: activeRoute.estimatedTotalMinutes,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();

    try {
      if (isEditModalOpen && activeRoute) {
        await busApiService.updateRoute(activeRoute.id, routeFormData);
        setStatusMessage(`Route "${routeFormData.name}" updated successfully.`);
      } else {
        const created = await busApiService.addRoute(routeFormData);
        setSelectedRouteId(created.id);
        setStatusMessage(`New route "${created.name}" created and synced.`);
      }

      sound.playSuccess();
      setIsEditModalOpen(false);
      setIsAddModalOpen(false);
      onRefresh();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Error saving route: ${err.message}`);
      sound.playAlert();
    }
  };

  // Reorder stops up or down
  const handleMoveStop = async (index: number, direction: 'up' | 'down') => {
    if (!activeRoute) return;
    const stops = [...activeRoute.stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    sound.playClick();
    // Swap
    const temp = stops[index];
    stops[index] = stops[targetIndex];
    stops[targetIndex] = temp;

    // Recalculate sequence numbers
    stops.forEach((s, idx) => {
      s.sequence = idx + 1;
    });

    try {
      await busApiService.updateRoute(activeRoute.id, { stops });
      sound.playSuccess();
      onRefresh();
    } catch (err: any) {
      console.error('Error reordering stops:', err);
    }
  };

  const handleDeleteStop = async (stopId: string, stopName: string) => {
    if (!window.confirm(`Remove stop "${stopName}" from this route?`)) return;
    sound.playClick();

    try {
      await busApiService.deleteStop(stopId);
      sound.playSuccess();
      setStatusMessage(`Stop "${stopName}" deleted from route.`);
      onRefresh();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(`Error deleting stop: ${err.message}`);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Route className="w-5 h-5 text-indigo-400" />
            <span>Route & Stop Sequence Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure transit corridors, rearrange stop sequence orders, and view estimated trip times.
          </p>
        </div>

        <button
          onClick={handleOpenAddRoute}
          className="px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>CREATE NEW ROUTE</span>
        </button>
      </div>

      {/* Route Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
        {routes.map(r => (
          <button
            key={r.id}
            onClick={() => { sound.playClick(); setSelectedRouteId(r.id); }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
              activeRoute?.id === r.id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10">
              {r.routeNumber ? `Line ${r.routeNumber}` : r.code}
            </span>
            <span>{r.name}</span>
          </button>
        ))}
      </div>

      {/* Active Route Details Card */}
      {activeRoute && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Route Specifications */}
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Route Specifications
              </span>
              <button
                onClick={handleOpenEditRoute}
                className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/20 transition-colors flex items-center gap-1 text-xs font-bold"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Route Name & Line</span>
              <h3 className="text-base font-extrabold text-white mt-0.5">{activeRoute.name}</h3>
              <span className="inline-block mt-1 font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Route #{activeRoute.routeNumber || activeRoute.code} ({activeRoute.code})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-slate-400 block mb-0.5">Origin Station</span>
                <span className="text-xs font-bold text-slate-200">{activeRoute.origin}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-slate-400 block mb-0.5">Destination</span>
                <span className="text-xs font-bold text-cyan-400">{activeRoute.destination}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-slate-400 block mb-0.5">Total Distance</span>
                <span className="text-sm font-black text-white">{activeRoute.totalDistanceKm} km</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-slate-400 block mb-0.5">Est. Travel Time</span>
                <span className="text-sm font-black text-white">~{activeRoute.estimatedTotalMinutes} mins</span>
              </div>
            </div>

            {activeRoute.description && (
              <div className="pt-2 text-xs text-slate-400 leading-relaxed">
                {activeRoute.description}
              </div>
            )}
          </div>

          {/* Right 2 Columns: Stops Ordered Sequence */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Stop Sequence Order ({activeRoute.stops.length} Stops)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Use arrows to adjust boarding sequence
              </span>
            </div>

            <div className="space-y-2.5">
              {activeRoute.stops.map((stop, index) => (
                <div
                  key={stop.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {/* Sequence Badge */}
                    <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 font-mono font-black text-xs flex items-center justify-center border border-indigo-500/30">
                      {stop.sequence || index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{stop.name}</span>
                        {stop.isTerminal && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
                            TERMINAL
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{stop.scheduledTime || '07:30 AM'}</span>
                        </span>
                        <span>•</span>
                        <span>{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reordering and Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveStop(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                      title="Move stop earlier in sequence"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveStop(index, 'down')}
                      disabled={index === activeRoute.stops.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                      title="Move stop later in sequence"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStop(stop.id, stop.name)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors ml-1 cursor-pointer"
                      title="Remove stop from route"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* CREATE / EDIT ROUTE MODAL */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl my-6 bg-[#0B132B] border border-indigo-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(99,102,241,0.25)] text-white">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Route className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {isEditModalOpen ? `Edit Route: ${activeRoute?.name}` : 'Deploy New Route Corridor'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defines stop line structure and trip timings
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Route Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tambaram ➔ DCE College"
                  value={routeFormData.name}
                  onChange={(e) => setRouteFormData({ ...routeFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs font-bold focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Route Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="R-21"
                    value={routeFormData.code}
                    onChange={(e) => setRouteFormData({ ...routeFormData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Route Number (Line)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="21"
                    value={routeFormData.routeNumber}
                    onChange={(e) => setRouteFormData({ ...routeFormData, routeNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Origin Point
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tambaram West"
                    value={routeFormData.origin}
                    onChange={(e) => setRouteFormData({ ...routeFormData, origin: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Destination Point
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="DCE Campus, Manimangalam"
                    value={routeFormData.destination}
                    onChange={(e) => setRouteFormData({ ...routeFormData, destination: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Total Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={routeFormData.totalDistanceKm}
                    onChange={(e) => setRouteFormData({ ...routeFormData, totalDistanceKm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Est. Travel Time (mins)
                  </label>
                  <input
                    type="number"
                    value={routeFormData.estimatedTotalMinutes}
                    onChange={(e) => setRouteFormData({ ...routeFormData, estimatedTotalMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Route Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Key highway corridors, major junction stops..."
                  value={routeFormData.description}
                  onChange={(e) => setRouteFormData({ ...routeFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs focus:border-indigo-400 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black tracking-wide shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-pointer active:scale-95 transition-all"
                >
                  Save Route
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
