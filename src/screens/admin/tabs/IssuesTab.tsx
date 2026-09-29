import React, { useState } from 'react';
import type { StaffIssueReport, BusVehicle } from '../../../types/bus';
import { busApiService } from '../../../services/busApiService';
import { sound } from '../../../utils/sound';
import { AlertTriangle, CheckCircle, MapPin, Search, X, ShieldAlert } from 'lucide-react';

interface IssuesTabProps {
  issues: StaffIssueReport[];
  buses: BusVehicle[];
  onRefresh: () => void;
}

export const IssuesTab: React.FC<IssuesTabProps> = ({ issues, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedIssue, setSelectedIssue] = useState<StaffIssueReport | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [newStatus, setNewStatus] = useState<StaffIssueReport['status']>('Acknowledged');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleOpenDetail = (issue: StaffIssueReport) => {
    sound.playClick();
    setSelectedIssue(issue);
    setAdminRemarks(issue.adminRemarks || '');
    setNewStatus(issue.status);
  };

  const handleUpdateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    sound.playClick();
    try {
      await busApiService.updateIssueStatus(selectedIssue.id, newStatus, adminRemarks);
      sound.playSuccess();
      setStatusMessage(`Issue on bus ${selectedIssue.busNumber} updated to '${newStatus}'.`);
      setSelectedIssue(null);
      onRefresh();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Error updating issue: ${err.message}`);
    }
  };

  const filteredIssues = issues.filter(i => {
    const matchesSearch = 
      i.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.issueType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatusFilter === 'ALL' || i.status === selectedStatusFilter;
    const matchesPriority = selectedPriorityFilter === 'ALL' || i.priority === selectedPriorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

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
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>Staff Incident & Issue Management</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Review real-time breakdowns, mechanical issues, traffic gridlocks, and GPS alerts reported by drivers.
        </p>
      </div>

      {/* Controls / Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search issues, bus number, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="New">New</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>

        <select
          value={selectedPriorityFilter}
          onChange={(e) => setSelectedPriorityFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
        >
          <option value="ALL">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Issues Table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/10 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Bus & Reporter</th>
                <th className="p-3.5">Issue Type & Description</th>
                <th className="p-3.5">Reported Location</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No issue reports match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                        issue.priority === 'Critical'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                          : issue.priority === 'High'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      }`}>
                        {issue.priority}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-white text-xs">{issue.busNumber}</div>
                      <div className="text-[10px] text-slate-400">{issue.staffName}</div>
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-cyan-400 text-xs">{issue.issueType}</div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-tight">
                        {issue.description}
                      </p>
                    </td>
                    <td className="p-3.5 text-slate-300 font-mono text-[10px]">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[150px]">{issue.location}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        issue.status === 'Resolved' || issue.status === 'Closed'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : issue.status === 'In Progress'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 text-[10px] font-mono">
                      {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenDetail(issue)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT & RESOLVE ISSUE MODAL */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl my-6 bg-[#0B132B] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(244,63,94,0.25)] text-white">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Manage Incident: {selectedIssue.issueType}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Reported by {selectedIssue.staffName} for {selectedIssue.busNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateIssue} className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400">{selectedIssue.issueType}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(selectedIssue.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed font-sans">
                  {selectedIssue.description}
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedIssue.location}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Update Resolution Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
                >
                  <option value="New">New (Pending Inspection)</option>
                  <option value="Acknowledged">Acknowledged (Support Dispatched)</option>
                  <option value="In Progress">In Progress (Mechanical Team on Site)</option>
                  <option value="Resolved">Resolved (Cleared for Service)</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Admin Remarks / Garage Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Spare bus DCE-04 redirected to cover remaining stops. Mechanical crew dispatched."
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-cyan-400 focus:outline-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-black shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all cursor-pointer"
                >
                  Save Status
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
