import React, { useState } from 'react';
import type { BusVehicle, BusRoute, StaffUser } from '../../../types/bus';
import { busApiService } from '../../../services/busApiService';
import { sound } from '../../../utils/sound';
import { Bus, Plus, Edit2, Trash2, Search, CheckCircle, X } from 'lucide-react';

interface BusesTabProps {
  buses: BusVehicle[];
  routes: BusRoute[];
  staffList: StaffUser[];
  onRefresh: () => void;
}

export const BusesTab: React.FC<BusesTabProps> = ({ buses, routes, staffList, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<BusVehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    busNumber: '',
    plateNumber: '',
    busImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
    routeId: '',
    routeName: '',
    startingPoint: '',
    destination: '',
    assignedStaffId: '',
    driverName: '',
    driverPhone: '',
    capacity: 50,
    operationalStatus: 'In Service' as BusVehicle['operationalStatus'],
    isActive: true,
  });

  const handleOpenAdd = () => {
    sound.playClick();
    setEditingBus(null);
    const defaultRoute = routes[0];
    const defaultStaff = staffList[0];

    setFormData({
      busNumber: `DCE-${String(buses.length + 1).padStart(2, '0')}`,
      plateNumber: `TN-11-DCE-${Math.floor(1000 + Math.random() * 9000)}`,
      busImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
      routeId: defaultRoute?.id || 'route-07',
      routeName: defaultRoute?.name || 'Guindy ➔ DCE Express',
      startingPoint: defaultRoute?.origin || 'Guindy Kathipara',
      destination: defaultRoute?.destination || 'DCE Campus, Manimangalam',
      assignedStaffId: defaultStaff?.id || 'staff-01',
      driverName: defaultStaff?.name || 'Muruganandam K.',
      driverPhone: defaultStaff?.phone || '+91 94440 12894',
      capacity: 52,
      operationalStatus: 'In Service',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bus: BusVehicle) => {
    sound.playClick();
    setEditingBus(bus);
    setFormData({
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      busImage: bus.busImage || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
      routeId: bus.routeId,
      routeName: bus.routeName || '',
      startingPoint: bus.startingPoint || '',
      destination: bus.destination || 'DCE Campus, Manimangalam',
      assignedStaffId: bus.assignedStaffId || '',
      driverName: bus.driverName,
      driverPhone: bus.driverPhone,
      capacity: bus.capacity,
      operationalStatus: bus.operationalStatus || 'In Service',
      isActive: bus.isActive !== undefined ? bus.isActive : true,
    });
    setIsModalOpen(true);
  };

  const handleRouteChange = (rId: string) => {
    const selected = routes.find(r => r.id === rId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        routeId: selected.id,
        routeName: selected.name,
        startingPoint: selected.origin,
        destination: selected.destination,
      }));
    }
  };

  const handleStaffChange = (staffId: string) => {
    const selected = staffList.find(s => s.id === staffId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        assignedStaffId: selected.id,
        driverName: selected.name,
        driverPhone: selected.phone,
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.busNumber.trim()) return;

    setIsSubmitting(true);
    sound.playClick();

    try {
      if (editingBus) {
        await busApiService.updateBus(editingBus.id, {
          ...formData,
          statusText: `${formData.operationalStatus} (Updated by Admin)`
        });
        setStatusMessage(`Bus ${formData.busNumber} updated in central database.`);
      } else {
        await busApiService.addBus({
          ...formData,
          statusText: 'In Service (Active Fleet)'
        });
        setStatusMessage(`Bus ${formData.busNumber} added successfully. Synchronized across Web and APK.`);
      }

      sound.playSuccess();
      setIsModalOpen(false);
      onRefresh();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Error saving bus: ${err.message}`);
      sound.playAlert();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (bus: BusVehicle) => {
    if (!window.confirm(`Are you sure you want to remove bus "${bus.busNumber}" from the active transit fleet?`)) {
      return;
    }

    sound.playClick();
    try {
      await busApiService.deleteBus(bus.id);
      sound.playSuccess();
      setStatusMessage(`Bus ${bus.busNumber} deleted from database.`);
      onRefresh();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Error deleting bus: ${err.message}`);
      sound.playAlert();
    }
  };

  // Filter buses
  const filteredBuses = buses.filter(b => {
    const matchesSearch = 
      b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.routeName && b.routeName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      selectedStatusFilter === 'ALL' || 
      b.operationalStatus === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner Alert Message */}
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

      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bus className="w-5 h-5 text-cyan-400" />
            <span>Bus Fleet Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Add, edit, reassign staff, and monitor live vehicle positions across campus routes.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black tracking-wide flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ADD NEW BUS</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by bus number (e.g. DCE-01), plate, driver, route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-medium"
          />
        </div>

        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
        >
          <option value="ALL">All Operational Statuses</option>
          <option value="In Service">In Service</option>
          <option value="On Route">On Route</option>
          <option value="Delayed">Delayed</option>
          <option value="Breakdown">Breakdown</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Out of Service">Out of Service</option>
        </select>
      </div>

      {/* Buses Table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/10 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">Bus Identifier</th>
                <th className="p-3.5">Route Information</th>
                <th className="p-3.5">Assigned Staff</th>
                <th className="p-3.5">Capacity</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Telemetry Coordinates</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No buses match your filter query. Click "Add New Bus" to add one.
                  </td>
                </tr>
              ) : (
                filteredBuses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0 flex items-center justify-center">
                          {bus.busImage ? (
                            <img
                              src={bus.busImage}
                              alt={bus.busNumber}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-sm">🚌</span>
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-cyan-400">{bus.busNumber}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{bus.plateNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-300">
                      <div className="font-semibold text-white truncate max-w-[200px]">
                        {bus.routeName || routes.find(r => r.id === bus.routeId)?.name || 'Custom Route'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {bus.startingPoint || 'Starting Point'} ➔ {bus.destination || 'DCE Campus'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-white">{bus.driverName}</div>
                      <div className="text-[10px] text-slate-400">{bus.driverPhone}</div>
                    </td>
                    <td className="p-3.5 text-slate-300">
                      <div className="font-semibold text-white">{bus.capacity} Seats</div>
                      <div className="text-[10px] text-slate-400">{bus.currentOccupancy || 0} Occupied</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                        bus.operationalStatus === 'Delayed'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/35'
                          : bus.operationalStatus === 'Breakdown'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/35'
                          : bus.operationalStatus === 'Maintenance'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/35'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/35'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{bus.operationalStatus || 'In Service'}</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-300">
                      <div>
                        {bus.currentLat ? `${bus.currentLat.toFixed(4)}, ${bus.currentLng?.toFixed(4)}` : '12.9249, 80.1165'}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-bold">
                        {bus.currentSpeed || 0} km/h • {bus.lastUpdated ? new Date(bus.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(bus)}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white transition-colors cursor-pointer"
                          title="Edit bus parameters and staff assignment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(bus)}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Delete bus from fleet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT BUS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl my-6 bg-[#0B132B] border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.25)] text-white">
            
            {/* Modal Title */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingBus ? `Edit Bus: ${editingBus.busNumber}` : 'Deploy New Campus Bus'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Syncs automatically with central API database & mobile APK
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Bus Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DCE-05 or DCE-BUS-05"
                    value={formData.busNumber}
                    onChange={(e) => setFormData({ ...formData, busNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs font-mono font-bold focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TN-11-AB-1234"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Route Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assigned Route
                </label>
                <select
                  value={formData.routeId}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-cyan-400 focus:outline-none cursor-pointer"
                >
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code || r.routeNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Reassignment Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assigned Bus Staff / Driver
                </label>
                <select
                  value={formData.assignedStaffId}
                  onChange={(e) => handleStaffChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-cyan-400 focus:outline-none cursor-pointer"
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone}) — {s.role.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Operational Status
                  </label>
                  <select
                    value={formData.operationalStatus}
                    onChange={(e) => setFormData({ ...formData, operationalStatus: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    <option value="In Service">In Service</option>
                    <option value="On Route">On Route</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Breakdown">Breakdown</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={80}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Bus Photo URL & Quick Presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Bus Photo URL / Image
                </label>
                <div className="flex gap-3 items-center mb-2">
                  <div className="w-16 h-12 rounded-xl bg-slate-900 border border-white/15 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {formData.busImage ? (
                      <img
                        src={formData.busImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xl">🚌</span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formData.busImage || ''}
                    onChange={(e) => setFormData({ ...formData, busImage: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-300">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, busImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800' })}
                    className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 transition-colors"
                  >
                    🚌 Yellow Campus Bus
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, busImage: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=800' })}
                    className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 transition-colors"
                  >
                    🚍 Express Coach
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, busImage: 'https://images.unsplash.com/photo-1618847791039-886c74c001ad?auto=format&fit=crop&q=80&w=800' })}
                    className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 transition-colors"
                  >
                    🚐 DCE Modern Liner
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                  />
                  <span>Active in Live Tracking</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Synchronizing...' : editingBus ? 'Save Changes' : 'Deploy Bus'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
