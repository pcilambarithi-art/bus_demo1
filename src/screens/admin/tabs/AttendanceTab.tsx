import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Cpu,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserPlus,
  Edit3,
  Radio,
  ShieldAlert,
  BatteryCharging,
  Thermometer,
  Navigation
} from 'lucide-react';

interface AttendanceRecordItem {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  busId: string;
  busNumber: string;
  routeId: string;
  stopId?: string;
  stopName: string;
  eventType: 'BOARDING' | 'EXIT';
  deviceId: string;
  timestamp: number;
  timestampIso: string;
  syncStatus: 'REALTIME' | 'OFFLINE_SYNCED' | 'MANUAL_CORRECTED';
  isAuthorized: boolean;
  remarks: string;
}

interface StudentItem {
  id: string;
  name: string;
  department: string;
  batch: string;
  rfidUid: string;
  qrToken: string;
  permittedBusIds: string[];
  permittedRouteIds: string[];
  designatedStopName: string;
  parentPhone: string;
  isActive: boolean;
}

interface PiDeviceItem {
  id: string;
  busId: string;
  deviceName: string;
  hardwareModel: string;
  modemModel: string;
  firmwareVersion: string;
  ipAddress: string;
  signalCsq: number;
  signalQualityLabel: string;
  gpsFixStatus: string;
  batteryVoltage: number;
  cpuTempC: number;
  secondsSinceHeartbeat: number;
  isOnline: boolean;
}

export const AttendanceTab: React.FC = () => {
  const [logs, setLogs] = useState<AttendanceRecordItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [devices, setDevices] = useState<PiDeviceItem[]>([]);
  const [summary, setSummary] = useState({
    totalRegisteredStudents: 0,
    totalEvents: 0,
    totalBoardings: 0,
    totalExits: 0,
    unauthorizedBoardings: 0,
    offlineSyncedEvents: 0,
  });
  const [filterBus, setFilterBus] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'warn' | 'error'; text: string } | null>(null);

  // Test RFID Tap state
  const [simIdentifier, setSimIdentifier] = useState<string>('RFID-07A1B2C3');
  const [simBusId, setSimBusId] = useState<string>('bus-07');
  const [simEventType, setSimEventType] = useState<'BOARDING' | 'EXIT'>('BOARDING');
  const [simStopName, setSimStopName] = useState<string>('Tambaram West Stand');

  // Correction modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordItem | null>(null);
  const [correctionRemarks, setCorrectionRemarks] = useState<string>('');
  const [correctionAuthorized, setCorrectionAuthorized] = useState<boolean>(true);

  // New Student Registration state
  const [showNewStudent, setShowNewStudent] = useState<boolean>(false);
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentDept, setNewStudentDept] = useState<string>('Computer Science & Engineering');
  const [newStudentRfid, setNewStudentRfid] = useState<string>('');
  const [newStudentBus, setNewStudentBus] = useState<string>('bus-07');
  const [newStudentStop, setNewStudentStop] = useState<string>('Tambaram West Stand');

  const fetchAllAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, repRes, stuRes, devRes] = await Promise.all([
        fetch('/api/attendance/logs?limit=100').then((r) => r.json()),
        fetch('/api/attendance/report').then((r) => r.json()),
        fetch('/api/students').then((r) => r.json()),
        fetch('/api/devices').then((r) => r.json()),
      ]);

      if (logsRes?.logs) setLogs(logsRes.logs);
      if (repRes?.summary) setSummary(repRes.summary);
      if (stuRes?.students) setStudents(stuRes.students);
      if (devRes?.devices) setDevices(devRes.devices);
    } catch (err) {
      console.warn('Failed fetching attendance/device telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAttendanceData();
  }, [fetchAllAttendanceData]);

  const handleTestRfidTap = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);
    try {
      const res = await fetch('/api/attendance/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIdentifier: simIdentifier,
          busId: simBusId,
          eventType: simEventType,
          stopName: simStopName,
          deviceId: `pi-${simBusId}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusBanner({ type: 'error', text: data.detail || 'RFID tap rejected' });
        return;
      }
      if (data.duplicate) {
        setStatusBanner({
          type: 'warn',
          text: `Anti-Passback Deduplication: ${data.message} (${data.attendance.studentName})`,
        });
      } else {
        setStatusBanner({
          type: data.attendance.isAuthorized ? 'success' : 'warn',
          text: `${data.attendance.eventType} recorded for ${data.attendance.studentName} (${data.attendance.studentId}) on ${data.attendance.busNumber} — ${
            data.attendance.isAuthorized ? 'Authorized Route' : 'WARNING: Unauthorized Bus!'
          }`,
        });
      }
      fetchAllAttendanceData();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Network error' });
    }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !correctionRemarks.trim()) return;
    try {
      const res = await fetch(`/api/attendance/${editingRecord.id}/correct`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAuthorized: correctionAuthorized,
          remarks: correctionRemarks.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusBanner({
          type: 'success',
          text: `Corrected attendance record for ${editingRecord.studentName} and wrote immutable audit log.`,
        });
        setEditingRecord(null);
        setCorrectionRemarks('');
        fetchAllAttendanceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId.trim() || !newStudentName.trim()) return;
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newStudentId.trim().toUpperCase(),
          name: newStudentName.trim(),
          department: newStudentDept,
          rfidUid: newStudentRfid.trim().toUpperCase() || undefined,
          permittedBusIds: [newStudentBus],
          permittedRouteIds: [newStudentBus.replace('bus-', 'route-')],
          designatedStopName: newStudentStop,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusBanner({
          type: 'success',
          text: `Registered student ${data.student.name} (${data.student.id}) with RFID ${data.student.rfidUid}`,
        });
        setShowNewStudent(false);
        setNewStudentId('');
        setNewStudentName('');
        setNewStudentRfid('');
        fetchAllAttendanceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLogs = logs.filter((l) =>
    filterBus === 'ALL' ? true : l.busId === filterBus || l.busNumber === filterBus
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-cyan-400" />
            RFID / QR Student Attendance &amp; Raspberry Pi 5 4G Agents
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live boarding/exit verification, offline 4G store-and-forward reconciliation, and Pi 5 hardware health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowNewStudent(!showNewStudent)}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Register Student Pass
          </button>
          <button
            onClick={fetchAllAttendanceData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {statusBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            statusBanner.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : statusBanner.type === 'warn'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button onClick={() => setStatusBanner(null)} className="text-[10px] underline ml-4 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Passes</span>
          <div className="text-2xl font-black text-white mt-1">{summary.totalRegisteredStudents}</div>
          <span className="text-[11px] text-cyan-400 font-semibold">13.56MHz RFID &amp; QR Enabled</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boardings / Exits</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {summary.totalBoardings} <span className="text-sm text-slate-400 font-normal">/ {summary.totalExits} Exits</span>
          </div>
          <span className="text-[11px] text-slate-400">5-min Anti-Passback Active</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">4G Offline Synced</span>
          <div className="text-2xl font-black text-sky-400 mt-1">{summary.offlineSyncedEvents}</div>
          <span className="text-[11px] text-slate-400">Store-and-Forward SQLite Queue</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route Exceptions</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{summary.unauthorizedBoardings}</div>
          <span className="text-[11px] text-amber-300/80">Boarded Non-Designated Bus</span>
        </div>
      </div>

      {/* Raspberry Pi 5 Bus Agent Hardware & 4G Modem Status Grid */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold text-white">
              Onboard Raspberry Pi 5 (4GB) Bus Agents &amp; 4G LTE Modems
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            NEO-6M (MP510_GPS_V02_WWXL) + Automotive 12V/24V→5V Buck Converter
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {devices.map((dev) => (
            <div
              key={dev.id}
              className="p-3.5 rounded-xl bg-[#0B132B]/90 border border-white/10 flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <span>{dev.id}</span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono">
                      {dev.busId.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{dev.modemModel}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                    dev.isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {dev.isOnline ? '4G ONLINE' : 'STANDBY'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px]">
                <div className="flex items-center gap-1 text-slate-300">
                  <Wifi className="w-3 h-3 text-cyan-400" />
                  <span>CSQ: {dev.signalCsq}/31</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300">
                  <Navigation className="w-3 h-3 text-emerald-400" />
                  <span>{dev.gpsFixStatus}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300">
                  <BatteryCharging className="w-3 h-3 text-amber-400" />
                  <span>Bus Bat: {dev.batteryVoltage.toFixed(1)}V</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300">
                  <Thermometer className="w-3 h-3 text-rose-400" />
                  <span>SoC: {dev.cpuTempC.toFixed(1)}°C</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Student Registration Form */}
      {showNewStudent && (
        <form
          onSubmit={handleRegisterStudent}
          className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-cyan-300">Register New Student RFID / QR Transport Pass</h3>
            <button
              type="button"
              onClick={() => setShowNewStudent(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Roll No (e.g. DCE-2025-CS101)"
              value={newStudentId}
              onChange={(e) => setNewStudentId(e.target.value)}
              required
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Student Full Name"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              required
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
            />
            <input
              type="text"
              placeholder="RFID UID (e.g. RFID-88A1B2C3)"
              value={newStudentRfid}
              onChange={(e) => setNewStudentRfid(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Department"
              value={newStudentDept}
              onChange={(e) => setNewStudentDept(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
            />
            <select
              value={newStudentBus}
              onChange={(e) => setNewStudentBus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0B132B] border border-white/15 text-xs text-white"
            >
              <option value="bus-07">DCE-BUS-07 (Tambaram)</option>
              <option value="bus-04">DCE-BUS-04 (Chromepet)</option>
              <option value="bus-12">DCE-BUS-12 (Guindy)</option>
              <option value="bus-18">DCE-BUS-18 (Velachery)</option>
            </select>
            <input
              type="text"
              placeholder="Designated Stop Name"
              value={newStudentStop}
              onChange={(e) => setNewStudentStop(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs cursor-pointer"
          >
            Save Student Pass
          </button>
        </form>
      )}

      {/* Test Mode RFID Card Tap Simulator */}
      <form
        onSubmit={handleTestRfidTap}
        className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-cyan-500/30 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold uppercase text-cyan-400 mb-1">
            [TEST MODE] Simulate Student RFID / QR Scan
          </label>
          <select
            value={simIdentifier}
            onChange={(e) => setSimIdentifier(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-white/15 text-xs text-white"
          >
            {students.map((s) => (
              <option key={s.id} value={s.rfidUid || s.id}>
                {s.name} ({s.id}) — {s.rfidUid} [Permitted: {s.permittedBusIds.join(', ')}]
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Bus</label>
          <select
            value={simBusId}
            onChange={(e) => setSimBusId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0B132B] border border-white/15 text-xs text-white"
          >
            <option value="bus-07">DCE-BUS-07 (pi-bus-07)</option>
            <option value="bus-04">DCE-BUS-04 (pi-bus-04)</option>
            <option value="bus-12">DCE-BUS-12 (pi-bus-12)</option>
            <option value="bus-18">DCE-BUS-18 (pi-bus-18)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Event</label>
          <select
            value={simEventType}
            onChange={(e) => setSimEventType(e.target.value as 'BOARDING' | 'EXIT')}
            className="px-3 py-2 rounded-xl bg-[#0B132B] border border-white/15 text-xs text-white"
          >
            <option value="BOARDING">BOARDING</option>
            <option value="EXIT">EXIT</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Current Station</label>
          <input
            type="text"
            value={simStopName}
            onChange={(e) => setSimStopName(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0B132B] border border-white/15 text-xs text-white"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5" />
          Trigger RFID Tap
        </button>
      </form>

      {/* Attendance Logs Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-white">Student Boarding &amp; Exit Verification Log</h3>
          <div className="flex items-center gap-2">
            {['ALL', 'bus-07', 'bus-04', 'bus-12', 'bus-18'].map((b) => (
              <button
                key={b}
                onClick={() => setFilterBus(b)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                  filterBus === b
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {b === 'ALL' ? 'All Buses' : b.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 bg-white/[0.02]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Bus &amp; Device</th>
                <th className="py-3 px-4">Event / Stop</th>
                <th className="py-3 px-4">Sync Mode</th>
                <th className="py-3 px-4">Authorization</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredLogs.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{item.studentName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.studentId} • {item.department}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-cyan-300">{item.busNumber}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.deviceId}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold mr-1.5 ${
                        item.eventType === 'BOARDING'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}
                    >
                      {item.eventType}
                    </span>
                    <span className="text-slate-300">{item.stopName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                        item.syncStatus === 'OFFLINE_SYNCED'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : item.syncStatus === 'MANUAL_CORRECTED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {item.syncStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {item.isAuthorized ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Permitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-bold">
                        <ShieldAlert className="w-3.5 h-3.5" /> Wrong Bus
                      </span>
                    )}
                    {item.remarks && (
                      <div className="text-[10px] text-slate-400 truncate max-w-[210px]">{item.remarks}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setEditingRecord(item);
                        setCorrectionAuthorized(item.isAuthorized);
                        setCorrectionRemarks(item.remarks || '');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Correct
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCorrection}
            className="w-full max-w-md rounded-2xl bg-[#0B132B] border border-white/15 p-5 space-y-4"
          >
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Administrative Attendance Correction (Audited)
            </h3>
            <p className="text-xs text-slate-400">
              Modifying record <span className="font-mono text-white">{editingRecord.id}</span> for{' '}
              <strong className="text-white">{editingRecord.studentName}</strong>.
            </p>
            <label className="flex items-center gap-2 text-xs text-white">
              <input
                type="checkbox"
                checked={correctionAuthorized}
                onChange={(e) => setCorrectionAuthorized(e.target.checked)}
              />
              Mark Boarding as Authorized Route Exception
            </label>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Mandatory Audit Remarks
              </label>
              <input
                type="text"
                required
                value={correctionRemarks}
                onChange={(e) => setCorrectionRemarks(e.target.value)}
                placeholder="Reason for administrative override..."
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-extrabold cursor-pointer"
              >
                Save &amp; Log Audit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
