import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, X, Search, Download, Trash2, 
  Users, Layers, School, RefreshCw, Lock, CheckCircle2,
  Calendar, Plus, Edit2, MapPin, Clock, Trophy, LogOut 
} from 'lucide-react';
import { getLocalRegistrations, isConfigured, supabase } from '../services/supabase';
import { getStoredEvents, saveStoredEvents } from '../data/eventsData';
import type { RegistrationRecord, EventItem } from '../types';
import { sound } from '../utils/audio';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Tab state: Registrations or Manage Events
  const [activeTab, setActiveTab] = useState<'registrations' | 'events'>('registrations');
  const [eventsList, setEventsList] = useState<EventItem[]>(() => getStoredEvents());

  // Event modal form state
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventFormData, setEventFormData] = useState({
    number: '',
    name: '',
    tagline: '',
    track: 'Technical' as 'Technical' | 'Non-Technical',
    category: 'Offensive' as 'Offensive' | 'Defensive' | 'Intel' | 'Research' | 'Strategy',
    type: 'Team (2-4 Members)',
    teamMin: 2,
    teamMax: 4,
    date: 'MARCH 15, 2027',
    time: '',
    venue: '',
    prizePool: '',
    coordinatorName: '',
    coordinatorContact: '',
    coCoordinatorName: '',
    coCoordinatorContact: '',
    description: '',
  });

  // Raw string value for the Custom team max input (allows deletion)
  const [customTeamMaxRaw, setCustomTeamMaxRaw] = useState('');
  const [customTeamMaxError, setCustomTeamMaxError] = useState('');

  // Sync with custom events updates
  useEffect(() => {
    const handleEventsUpdate = () => {
      setEventsList(getStoredEvents());
    };
    window.addEventListener('systech_events_updated', handleEventsUpdate);
    return () => window.removeEventListener('systech_events_updated', handleEventsUpdate);
  }, []);

  // Load records
  const fetchRecords = async () => {
    setIsLoading(true);
    // If Supabase is configured, try fetching cloud records
    if (supabase && isConfigured) {
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: RegistrationRecord[] = data.map((d: any) => ({
            id: d.id,
            registrationId: d.registration_id,
            fullName: d.full_name,
            email: d.email,
            phone: d.phone,
            collegeName: d.college_name,
            department: d.department,
            yearOfStudy: d.year_of_study,
            eventId: d.event_id,
            participationType: d.participation_type,
            teamName: d.team_name,
            teamMembers: d.team_members,
            qrPayload: d.qr_payload,
            status: d.status,
            createdAt: d.created_at,
          }));
          setRecords(mapped);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Cloud fetch fallback to local:', err);
      }
    }

    // Default to local vault
    const local = getLocalRegistrations();
    setRecords(local);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchRecords();
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    // Default master passkey: admin2k27 or admin
    if (passkey.trim().toLowerCase() === 'admin2k27' || passkey.trim().toLowerCase() === 'admin') {
      sound.playAccessGranted();
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid Security Authorization Passkey');
    }
  };

  const handleLogout = () => {
    sound.playClick();
    setIsAuthenticated(false);
    setPasskey('');
    setErrorMsg('');
    onClose();
  };

  // Export records to CSV
  const handleExportCSV = () => {
    sound.playClick();
    if (records.length === 0) return;

    const headers = [
      'Registration ID',
      'Full Name',
      'Email',
      'Phone',
      'College',
      'Department',
      'Year',
      'Event',
      'Format',
      'Team Name',
      'Registered At'
    ];

    const rows = records.map(r => [
      r.registrationId,
      `"${r.fullName}"`,
      r.email,
      r.phone,
      `"${r.collegeName}"`,
      `"${r.department}"`,
      r.yearOfStudy,
      r.eventId,
      r.participationType,
      `"${r.teamName || 'N/A'}"`,
      r.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SYSTECH2K27_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete a single registration record
  const handleDeleteRecord = async (record: RegistrationRecord) => {
    if (!window.confirm(`Delete registration for "${record.fullName}" (${record.registrationId})?`)) return;
    sound.playClick();

    if (supabase && isConfigured) {
      try {
        await supabase.from('registrations').delete().eq('id', record.id);
      } catch (err) {
        console.warn('Supabase delete failed, removing locally:', err);
      }
    } else {
      // Remove from localStorage
      const existing = JSON.parse(localStorage.getItem('systech2k27_registrations') || '[]') as RegistrationRecord[];
      const updated = existing.filter(r => r.registrationId !== record.registrationId);
      localStorage.setItem('systech2k27_registrations', JSON.stringify(updated));
    }

    // Immediately remove from UI state
    setRecords(prev => prev.filter(r => r.registrationId !== record.registrationId));
  };

  // Clear local records
  const handleClearLocalVault = () => {
    if (window.confirm('Clear all local vault registrations?')) {
      sound.playClick();
      localStorage.removeItem('systech2k27_registrations');
      setRecords([]);
    }
  };

  // Event Management Handlers
  const handleOpenAddEvent = () => {
    sound.playClick();
    const nextNum = String(eventsList.length + 1).padStart(2, '0');
    setEditingEventId(null);
    setEventFormData({
      number: nextNum,
      name: '',
      tagline: '',
      track: 'Technical',
      category: 'Offensive',
      type: 'Team (2-4 Members)',
      teamMin: 2,
      teamMax: 4,
      date: 'MARCH 15, 2027',
      time: '',
      venue: '',
      prizePool: '',
      coordinatorName: '',
      coordinatorContact: '',
      coCoordinatorName: '',
      coCoordinatorContact: '',
      description: '',
    });
    setCustomTeamMaxRaw('');
    setEventModalOpen(true);
  };

  const handleOpenEditEvent = (evt: EventItem) => {
    sound.playClick();
    setEditingEventId(evt.id);
    setEventFormData({
      number: evt.number,
      name: evt.name,
      tagline: evt.tagline,
      track: evt.track,
      category: evt.category,
      type: evt.type,
      teamMin: evt.teamMin,
      teamMax: evt.teamMax,
      date: evt.date,
      time: evt.time,
      venue: evt.venue,
      prizePool: evt.prizePool,
      coordinatorName: evt.coordinators?.[0]?.name || '',
      coordinatorContact: evt.coordinators?.[0]?.contact || '',
      coCoordinatorName: evt.coordinators?.[1]?.name || '',
      coCoordinatorContact: evt.coordinators?.[1]?.contact || '',
      description: evt.description || '',
    });
    setCustomTeamMaxRaw((evt.type as string) === 'Custom' ? String(evt.teamMax) : '');
    setEventModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate custom team size on submit
    if (eventFormData.type === 'Custom') {
      const num = parseInt(customTeamMaxRaw, 10);
      if (!customTeamMaxRaw.trim() || isNaN(num) || num < 1) {
        setCustomTeamMaxError('Minimum 1 member required.');
        return;
      }
      if (num > 20) {
        setCustomTeamMaxError('Maximum 20 members allowed.');
        return;
      }
    }

    if (
      !eventFormData.number.trim() ||
      !eventFormData.name.trim() ||
      !eventFormData.tagline.trim() ||
      !eventFormData.time.trim() ||
      !eventFormData.venue.trim() ||
      !eventFormData.prizePool.trim() ||
      !eventFormData.coordinatorName.trim() ||
      !eventFormData.coordinatorContact.trim() ||
      !eventFormData.coCoordinatorName.trim() ||
      !eventFormData.coCoordinatorContact.trim() ||
      !eventFormData.description.trim()
    ) {
      return;
    }

    sound.playAccessGranted();

    const coords: { name: string; contact: string }[] = [
      {
        name: eventFormData.coordinatorName.trim(),
        contact: eventFormData.coordinatorContact.trim()
      },
      {
        name: eventFormData.coCoordinatorName.trim(),
        contact: eventFormData.coCoordinatorContact.trim()
      }
    ];

    const updatedEvent: EventItem = {
      id: editingEventId || (eventFormData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `evt-${Date.now()}`),
      number: eventFormData.number.trim() || String(eventsList.length + 1).padStart(2, '0'),
      name: eventFormData.name.trim().toUpperCase(),
      tagline: eventFormData.tagline.trim(),
      track: eventFormData.track,
      category: eventFormData.category,
      description: eventFormData.description.trim(),
      detailedDescription: eventFormData.description.trim(),
      iconName: 'ShieldAlert',
      type: eventFormData.type as any,
      teamMin: Number(eventFormData.teamMin) || 1,
      teamMax: Number(eventFormData.teamMax) || 1,
      date: eventFormData.date.trim() || 'MARCH 15, 2027',
      time: eventFormData.time.trim(),
      venue: eventFormData.venue.trim(),
      prizePool: eventFormData.prizePool.trim(),
      rules: [
        'Adhere to fair play protocols and cyber ethical standards.',
        'Operatives must report to venue 15 minutes before induction.',
        'Jury evaluation decision is final and binding.'
      ],
      eligibility: ['Open to all registered college students with valid identification.'],
      prerequisites: ['Basic domain knowledge and laptop for technical tracks.'],
      coordinators: coords
    };

    let updatedList: EventItem[];
    if (editingEventId) {
      updatedList = eventsList.map(e => e.id === editingEventId ? { ...e, ...updatedEvent } : e);
    } else {
      updatedList = [...eventsList, updatedEvent];
    }

    setEventsList(updatedList);
    saveStoredEvents(updatedList);
    setEventModalOpen(false);
  };

  const handleDeleteEvent = (eventId: string, eventName: string) => {
    if (window.confirm(`Are you sure you want to delete "${eventName}"?`)) {
      sound.playClick();
      const updated = eventsList.filter(e => e.id !== eventId);
      setEventsList(updated);
      saveStoredEvents(updated);
    }
  };

  const handleDeleteAllEvents = () => {
    if (window.confirm('Are you sure you want to delete ALL events? This action will remove all symposium events.')) {
      sound.playClick();
      setEventsList([]);
      saveStoredEvents([]);
    }
  };

  // Filtering
  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.registrationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.collegeName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEvent = selectedEventFilter === 'ALL' || r.eventId === selectedEventFilter;

    return matchesSearch && matchesEvent;
  });

  const uniqueColleges = new Set(records.map(r => r.collegeName.trim().toLowerCase())).size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-lg transition-opacity"
        onClick={handleLogout}
      />

      {/* Admin Window */}
      <div className="relative w-full max-w-5xl my-6 bg-cyber-950 border border-cyber-cyan/40 rounded-2xl shadow-[0_0_60px_rgba(0,240,255,0.25)] overflow-hidden z-10 font-mono text-slate-200">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-cyber-900 border-b border-cyber-cyan/20">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded bg-cyber-cyan/15 text-cyber-cyan">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="font-orbitron font-bold text-xs sm:text-sm text-white tracking-wider">
              SYSTECH 2K27 // ADMIN COMMAND CENTER
            </span>
          </div>

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="liquid-glass-rose flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-rose-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
              title="Terminate session and logout"
            >
              <div className="relative z-10 flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>LOGOUT</span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* AUTHENTICATION GATE */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 max-w-md mx-auto text-center space-y-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyber-900 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan shadow-neon-cyan">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-orbitron font-bold text-xl text-white">
                SECURITY CLEARANCE REQUIRED
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter Administrator Master Passkey to access operative records.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Enter Your Passkey"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-cyber-900 border border-cyber-cyan/30 text-center text-white text-sm tracking-widest placeholder:text-slate-600 focus:outline-none focus:border-cyber-cyan shadow-inner"
                  autoFocus
                />
                {errorMsg && (
                  <span className="text-[11px] text-rose-400 mt-2 block font-mono">
                    [ACCESS DENIED] {errorMsg}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-violet text-black font-mono font-bold text-xs tracking-widest shadow-neon-cyan hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                AUTHORIZE ACCESS
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN DASHBOARD */
          <div className="p-5 sm:p-7 space-y-6 max-h-[80vh] overflow-y-auto">
            
            {/* View Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { sound.playClick(); setActiveTab('registrations'); }}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'registrations'
                      ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 shadow-neon-cyan'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>REGISTRATIONS ({records.length})</span>
                </button>

                <button
                  onClick={() => { sound.playClick(); setActiveTab('events'); }}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'events'
                      ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 shadow-neon-cyan'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>MANAGE EVENTS ({eventsList.length})</span>
                </button>
              </div>

              {activeTab === 'events' && (
                <div className="flex items-center gap-2">
                  {eventsList.length > 0 && (
                    <button
                      onClick={handleDeleteAllEvents}
                      className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Delete all events"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden sm:inline">DELETE ALL</span>
                    </button>
                  )}

                  <button
                    onClick={handleOpenAddEvent}
                    className="liquid-glass-register px-4 py-1.5 rounded-xl text-black font-mono font-bold text-xs tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <div className="relative z-10 flex items-center gap-1.5 text-black font-extrabold">
                      <Plus className="w-3.5 h-3.5 text-black" />
                      <span>ADD EVENT</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: REGISTRATIONS VIEW */}
            {activeTab === 'registrations' && (
              <div className="space-y-6">
                {/* Top Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="p-4 rounded-xl bg-cyber-900/80 border border-cyber-cyan/20">
                    <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5 text-cyber-cyan" />
                      <span>TOTAL REGISTRATIONS</span>
                    </div>
                    <div className="font-orbitron font-extrabold text-2xl text-white">
                      {records.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyber-900/80 border border-cyber-violet/20">
                    <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <School className="w-3.5 h-3.5 text-cyber-violet" />
                      <span>COLLEGES / NODES</span>
                    </div>
                    <div className="font-orbitron font-extrabold text-2xl text-cyber-violet">
                      {uniqueColleges}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyber-900/80 border border-cyber-cyan/20">
                    <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <Layers className="w-3.5 h-3.5 text-cyber-cyan" />
                      <span>TECHNICAL TRACK</span>
                    </div>
                    <div className="font-orbitron font-extrabold text-2xl text-cyber-cyan">
                      {records.filter(r => {
                        const evt = eventsList.find(e => e.id === r.eventId);
                        return evt?.track === 'Technical';
                      }).length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyber-900/80 border border-cyber-violet/30">
                    <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <Layers className="w-3.5 h-3.5 text-cyber-violet" />
                      <span>NON-TECHNICAL TRACK</span>
                    </div>
                    <div className="font-orbitron font-extrabold text-2xl text-cyber-violet">
                      {records.filter(r => {
                        const evt = eventsList.find(e => e.id === r.eventId);
                        return evt?.track === 'Non-Technical';
                      }).length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyber-900/80 border border-emerald-500/20">
                    <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>STATUS</span>
                    </div>
                    <div className="font-orbitron font-bold text-base text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>GRID ONLINE</span>
                    </div>
                  </div>
                </div>

                {/* Controls Bar: Search, Filter, Export */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by name, ID, college..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-cyber-900 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyber-cyan"
                      />
                    </div>

                    <select
                      value={selectedEventFilter}
                      onChange={(e) => setSelectedEventFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-cyber-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyber-cyan"
                    >
                      <option value="ALL">All Events</option>
                      {eventsList.map(evt => (
                        <option key={evt.id} value={evt.id}>
                          #{evt.number} {evt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => { sound.playClick(); fetchRecords(); }}
                      title="Refresh records"
                      disabled={isLoading}
                      className="p-2 rounded-xl bg-cyber-900 border border-white/10 text-slate-300 hover:text-cyber-cyan hover:border-cyber-cyan transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 transition-transform ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                      onClick={handleExportCSV}
                      disabled={records.length === 0}
                      className="px-3.5 py-2 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan hover:text-black font-mono font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>EXPORT CSV</span>
                    </button>

                    {!isConfigured && records.length > 0 && (
                      <button
                        onClick={handleClearLocalVault}
                        className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-black transition-colors"
                        title="Clear local test records"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Records Table */}
                <div className="rounded-xl border border-white/10 overflow-hidden bg-cyber-950/80">
                  {filteredRecords.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <p className="text-slate-400 text-xs">
                        {records.length === 0 
                          ? 'No registrations recorded yet. Register participants to see entries populate here in real-time!' 
                          : 'No records matching your search query.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-cyber-900 border-b border-white/10 text-[10px] text-slate-400 uppercase tracking-wider">
                            <th className="p-3">REG ID</th>
                            <th className="p-3">OPERATIVE NAME</th>
                            <th className="p-3">COLLEGE / DEPT</th>
                            <th className="p-3">EVENT</th>
                            <th className="p-3">FORMAT</th>
                            <th className="p-3">CONTACT</th>
                            <th className="p-3 text-rose-400">DELETE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredRecords.map((rec) => {
                            const evt = eventsList.find(e => e.id === rec.eventId);
                            return (
                              <tr key={rec.registrationId} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 font-bold text-cyber-cyan">
                                  {rec.registrationId}
                                </td>
                                <td className="p-3 font-medium text-white">
                                  <div>{rec.fullName}</div>
                                  <div className="text-[10px] text-slate-400">{rec.yearOfStudy}</div>
                                </td>
                                <td className="p-3 text-slate-300">
                                  <div className="truncate max-w-[200px]">{rec.collegeName}</div>
                                  <div className="text-[10px] text-slate-500">{rec.department}</div>
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded bg-white/5 text-slate-200 text-[11px] font-semibold border border-white/10">
                                    {evt ? evt.name : rec.eventId}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-300">
                                  <div>{rec.participationType}</div>
                                  {rec.teamName && (
                                    <div className="text-[10px] text-cyber-violet">
                                      {rec.teamName} ({rec.teamMembers?.filter(Boolean).length || 0} extra)
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-slate-400 text-[11px]">
                                  <div>{rec.email}</div>
                                  <div>{rec.phone}</div>
                                </td>
                                <td className="p-3">
                                  <button
                                    onClick={() => handleDeleteRecord(rec)}
                                    title="Delete registration"
                                    className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-90 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MANAGE EVENTS VIEW */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                {/* Event Stats Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-xl bg-cyber-900/80 border border-cyber-cyan/20">
                    <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-cyber-cyan" />
                      <span>TOTAL EVENTS</span>
                    </div>
                    <div className="font-orbitron font-extrabold text-2xl text-white">
                      {eventsList.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyber-900/80 border border-cyber-cyan/20">
                    <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <Layers className="w-3.5 h-3.5 text-cyber-cyan" />
                      <span>TECHNICAL EVENTS</span>
                    </div>
                    <div className="font-orbitron font-extrabold text-2xl text-cyber-cyan">
                      {eventsList.filter(e => e.track === 'Technical').length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyber-900/80 border border-cyber-violet/20">
                    <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <Layers className="w-3.5 h-3.5 text-cyber-violet" />
                      <span>NON-TECHNICAL</span>
                    </div>
                    <div className="font-orbitron font-extrabold text-2xl text-cyber-violet">
                      {eventsList.filter(e => e.track === 'Non-Technical').length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyber-900/80 border border-emerald-500/20">
                    <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>TOTAL REGISTRATIONS</span>
                    </div>
                    <div className="font-orbitron font-extrabold text-2xl text-emerald-400">
                      {records.length}
                    </div>
                  </div>
                </div>

                {/* Event Cards Grid */}
                {eventsList.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-cyber-900/40 border border-white/10 space-y-4 font-mono">
                    <Calendar className="w-10 h-10 text-cyber-cyan mx-auto opacity-60" />
                    <div>
                      <h4 className="font-orbitron font-bold text-white text-base">NO EVENTS CONFIGURED</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        All symposium events have been deleted. Click the button below to create and deploy your first event.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenAddEvent}
                      className="liquid-glass-register px-6 py-2.5 rounded-xl text-black font-bold text-xs tracking-wider cursor-pointer active:scale-95"
                    >
                      <div className="relative z-10 flex items-center gap-2 text-black font-extrabold">
                        <Plus className="w-4 h-4 text-black" />
                        <span>+ ADD NEW EVENT</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eventsList.map((evt) => {
                    const evtRegistrations = records.filter(r => r.eventId === evt.id).length;
                    return (
                      <div
                        key={evt.id}
                        className="p-5 rounded-xl bg-cyber-900/70 border border-white/10 hover:border-cyber-cyan/40 transition-all space-y-4"
                      >
                        {/* Header: Track & Action Buttons */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] px-2 py-0.5 rounded bg-cyber-cyan/15 text-cyber-cyan font-mono font-bold border border-cyber-cyan/30">
                              #{evt.number}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              evt.track === 'Technical'
                                ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30'
                                : 'bg-cyber-violet/10 text-cyber-violet border-cyber-violet/30'
                            }`}>
                              {evt.track}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleOpenEditEvent(evt)}
                              className="p-1.5 rounded-lg bg-cyber-950 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan hover:text-black transition-all cursor-pointer"
                              title="Edit Event Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteEvent(evt.id, evt.name)}
                              className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title & Tagline */}
                        <div>
                          <h4 className="font-orbitron font-bold text-white text-base">
                            {evt.name}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {evt.tagline}
                          </p>
                        </div>

                        {/* Event Details Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 font-mono bg-cyber-950/50 p-3 rounded-lg border border-white/5">
                          <div className="flex items-center gap-1.5 truncate">
                            <Clock className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
                            <span className="truncate">{evt.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-cyber-violet shrink-0" />
                            <span className="truncate">{evt.venue}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-amber-400 font-bold truncate">{evt.prizePool}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{evt.type}</span>
                          </div>
                        </div>

                        {/* Footer: Registrations & Coordinator */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] gap-2">
                          <div className="text-slate-400 truncate text-[10px]">
                            <span>Lead: <strong className="text-slate-200">{evt.coordinators?.[0]?.name || 'N/A'}</strong> ({evt.coordinators?.[0]?.contact || 'N/A'})</span>
                            {evt.coordinators?.[1]?.name && (
                              <span className="ml-2">| Co: <strong className="text-slate-200">{evt.coordinators[1].name}</strong> ({evt.coordinators[1].contact})</span>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono font-bold shrink-0 text-[10px]">
                            {evtRegistrations} Registered
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Edit / Create Event Modal */}
        {eventModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-2xl bg-cyber-950 border border-cyber-cyan/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.25)] p-6 font-mono text-slate-200 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyber-cyan" />
                  <span className="font-orbitron font-bold text-sm text-white">
                    {editingEventId ? 'EDIT EVENT CONFIGURATION' : 'CREATE NEW SYMPOSIUM EVENT'}
                  </span>
                </div>
                <button
                  onClick={() => setEventModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      EVENT NUMBER <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventFormData.number}
                      onChange={(e) => setEventFormData({ ...eventFormData, number: e.target.value })}
                      placeholder="01"
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">
                      EVENT NAME <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventFormData.name}
                      onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                      placeholder="e.g. CYBER CTF"
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    TAGLINE / BRIEF MOTTO <span className="text-cyber-cyan font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventFormData.tagline}
                    onChange={(e) => setEventFormData({ ...eventFormData, tagline: e.target.value })}
                    placeholder="e.g. Capture The Flag: Grid Infiltration"
                    className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      TRACK <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <select
                      required
                      value={eventFormData.track}
                      onChange={(e) => setEventFormData({ ...eventFormData, track: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    >
                      <option value="Technical">Technical</option>
                      <option value="Non-Technical">Non-Technical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      FORMAT / TYPE <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <select
                      required
                      value={eventFormData.type}
                      onChange={(e) => {
                        const val = e.target.value;
                        let min = 1, max = 1;
                        if (val === 'Team (2 Members)') { min = 2; max = 2; }
                        else if (val === 'Team (3 Members)') { min = 3; max = 3; }
                        else if (val === 'Team (4 Members)') { min = 4; max = 4; }
                        else if (val === 'Custom') { min = 1; max = 20; }
                        if (val !== 'Custom') {
                          setCustomTeamMaxRaw('');
                          setCustomTeamMaxError('');
                        }
                        setEventFormData({ ...eventFormData, type: val, teamMin: min, teamMax: max });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Team (2 Members)">Team (2 Members)</option>
                      <option value="Team (3 Members)">Team (3 Members)</option>
                      <option value="Team (4 Members)">Team (4 Members)</option>
                      <option value="Custom">Custom</option>
                    </select>

                    {eventFormData.type === 'Custom' && (
                      <div>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          required
                          value={customTeamMaxRaw}
                          onKeyDown={(e) => {
                            // Block e, E, +, - and decimal point
                            if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
                          }}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setCustomTeamMaxRaw(raw);
                            if (raw === '') {
                              setCustomTeamMaxError('Minimum 1 member required.');
                              setEventFormData({ ...eventFormData, teamMin: 1, teamMax: 0 });
                            } else {
                              const num = parseInt(raw, 10);
                              if (isNaN(num) || num < 1) {
                                setCustomTeamMaxError('Minimum 1 member required.');
                                setEventFormData({ ...eventFormData, teamMin: 1, teamMax: 0 });
                              } else if (num > 20) {
                                setCustomTeamMaxError('Maximum 20 members allowed.');
                                setEventFormData({ ...eventFormData, teamMin: 1, teamMax: 20 });
                              } else {
                                setCustomTeamMaxError('');
                                setEventFormData({ ...eventFormData, teamMin: 1, teamMax: num });
                              }
                            }
                          }}
                          placeholder="Max no. of members (1–20)"
                          className={`mt-2 w-full px-3 py-2 rounded-lg bg-cyber-900 border text-white focus:outline-none placeholder:text-slate-500 text-xs ${
                            customTeamMaxError ? 'border-red-500 focus:border-red-500' : 'border-cyber-cyan/40 focus:border-cyber-cyan'
                          }`}
                        />
                        {customTeamMaxError && (
                          <p className="mt-1 text-red-400 text-xs">{customTeamMaxError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      TIME <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventFormData.time}
                      onChange={(e) => setEventFormData({ ...eventFormData, time: e.target.value })}
                      placeholder="11:00 AM - 03:00 PM"
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      VENUE <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventFormData.venue}
                      onChange={(e) => setEventFormData({ ...eventFormData, venue: e.target.value })}
                      placeholder="Lab 102"
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      PRIZE POOL <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventFormData.prizePool}
                      onChange={(e) => setEventFormData({ ...eventFormData, prizePool: e.target.value })}
                      placeholder="₹25,000"
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      LEAD COORDINATOR NAME <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventFormData.coordinatorName}
                      onChange={(e) => setEventFormData({ ...eventFormData, coordinatorName: e.target.value })}
                      placeholder="Name (e.g. Kavya Raman)"
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      COORDINATOR PHONE <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventFormData.coordinatorContact}
                      onChange={(e) => setEventFormData({ ...eventFormData, coordinatorContact: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      CO-COORDINATOR NAME <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventFormData.coCoordinatorName}
                      onChange={(e) => setEventFormData({ ...eventFormData, coCoordinatorName: e.target.value })}
                      placeholder="Co-coordinator Name (e.g. Arjun Mehta)"
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      CO-COORDINATOR PHONE <span className="text-cyber-cyan font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventFormData.coCoordinatorContact}
                      onChange={(e) => setEventFormData({ ...eventFormData, coCoordinatorContact: e.target.value })}
                      placeholder="+91 98765 43211"
                      className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    DESCRIPTION <span className="text-cyber-cyan font-bold">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={eventFormData.description}
                    onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                    placeholder="Brief description of the competition protocol..."
                    className="w-full px-3 py-2 rounded-lg bg-cyber-900 border border-white/10 text-white focus:border-cyber-cyan focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEventModalOpen(false)}
                    className="liquid-glass px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-mono cursor-pointer active:scale-95"
                  >
                    <span className="relative z-10">CANCEL</span>
                  </button>
                  <button
                    type="submit"
                    className="liquid-glass-register px-6 py-2.5 rounded-xl text-black font-mono font-bold text-xs tracking-wider cursor-pointer active:scale-95"
                  >
                    <div className="relative z-10 flex items-center gap-2 text-black font-extrabold">
                      <ShieldCheck className="w-4 h-4 text-black" />
                      <span>SAVE EVENT PROTOCOL</span>
                    </div>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
