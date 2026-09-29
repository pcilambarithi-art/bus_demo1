import React, { useState } from 'react';
import type { StaffUser, BusVehicle } from '../../../types/bus';
import { busApiService } from '../../../services/busApiService';
import { sound } from '../../../utils/sound';
import { Users, Plus, Edit2, Phone, Mail, Bus, CheckCircle, X } from 'lucide-react';

interface StaffTabProps {
  staffList: StaffUser[];
  buses: BusVehicle[];
  onRefresh: () => void;
}

export const StaffTab: React.FC<StaffTabProps> = ({ staffList, buses, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'driver' as StaffUser['role'],
    assignedBusId: buses[0]?.id || 'bus-07',
    password: '',
    status: 'active' as StaffUser['status'],
  });

  const handleOpenAdd = () => {
    sound.playClick();
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '+91 ',
      role: 'driver',
      assignedBusId: buses[0]?.id || 'bus-07',
      password: 'dce' + Math.floor(1000 + Math.random() * 9000),
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffUser) => {
    sound.playClick();
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      assignedBusId: staff.assignedBusId,
      password: '',
      status: staff.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    sound.playClick();
    try {
      if (editingStaff) {
        await busApiService.updateStaff(editingStaff.id, formData);
        setStatusMessage(`Staff member "${formData.name}" updated successfully.`);
      } else {
        await busApiService.addStaff(formData);
        setStatusMessage(`New staff member "${formData.name}" onboarded and assigned to bus.`);
      }

      sound.playSuccess();
      setIsModalOpen(false);
      onRefresh();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Error saving staff: ${err.message}`);
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
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Bus Staff & Driver Operations</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage transport drivers, conductors, vehicle assignments, and portal access credentials.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ONBOARD STAFF</span>
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((staff) => {
          const assignedBus = buses.find(b => b.id === staff.assignedBusId);
          return (
            <div
              key={staff.id}
              className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-indigo-500/30 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">{staff.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                      {staff.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ID: {staff.id} • Status: {staff.status}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenEdit(staff)}
                  className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Edit staff details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{staff.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{staff.phone}</span>
                </div>
              </div>

              {/* Assigned Bus Card */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">
                      Assigned Bus
                    </span>
                    <span className="text-xs font-bold text-white leading-tight">
                      {assignedBus ? `${assignedBus.busNumber} (${assignedBus.plateNumber})` : 'Unassigned'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400">
                  Active
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl my-6 bg-[#0B132B] border border-indigo-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(99,102,241,0.25)] text-white">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Onboard New Bus Staff'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Provides access to mobile-friendly driver trip portal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                    Staff Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muruganandam K."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-indigo-400 focus:outline-none cursor-pointer"
                  >
                    <option value="driver">Bus Driver</option>
                    <option value="conductor">Bus Conductor</option>
                    <option value="supervisor">Fleet Supervisor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="staff@dce.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 94440 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-indigo-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Assigned Vehicle
                </label>
                <select
                  value={formData.assignedBusId}
                  onChange={(e) => setFormData({ ...formData, assignedBusId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-indigo-400 focus:outline-none cursor-pointer"
                >
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.busNumber} — {b.plateNumber} ({b.routeName || 'Assigned Route'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  {editingStaff ? 'Reset Login Password (leave blank to keep current)' : 'Login Password *'}
                </label>
                <input
                  type="text"
                  placeholder={editingStaff ? 'Enter new password if changing' : 'e.g. dce2024'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-indigo-400 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all cursor-pointer"
                >
                  Save Staff
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
