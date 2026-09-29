import React, { useState } from 'react';
import type { VoiceAnnouncement, BusRoute, BusStop } from '../../../types/bus';
import { busApiService } from '../../../services/busApiService';
import { gracefulVoice } from '../../../services/speechSynthesis';
import { sound } from '../../../utils/sound';
import { Volume2, Plus, Edit2, Trash2, Play, CheckCircle, X } from 'lucide-react';

interface AnnouncementsTabProps {
  announcements: VoiceAnnouncement[];
  routes: BusRoute[];
  stops: BusStop[];
  onRefresh: () => void;
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({ announcements, routes, stops, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    routeId: routes[0]?.id || 'route-07',
    stopId: stops[0]?.id || 'stop-07-3',
    stopName: stops[0]?.name || 'Tambaram West Stand',
    text: 'Attention passengers, the next stop is Tambaram. Please prepare to alight.',
    textTamil: 'கவனிக்கவும், அடுத்த நிறுத்தம் தாம்பரம்.',
    language: 'en-IN' as 'en-IN' | 'ta-IN',
    triggerDistanceMeters: 300,
    isActive: true,
  });

  const handleOpenAdd = () => {
    sound.playClick();
    setEditingId(null);
    const defaultRoute = routes[0];
    const defaultStop = defaultRoute?.stops?.[0] || stops[0];

    setFormData({
      routeId: defaultRoute?.id || 'route-07',
      stopId: defaultStop?.id || 'stop-07-3',
      stopName: defaultStop?.name || 'Tambaram West Stand',
      text: `The next stop is ${defaultStop?.name || 'Tambaram'}.`,
      textTamil: `அடுத்த நிறுத்தம் ${defaultStop?.shortName || 'தாம்பரம்'}.`,
      language: 'en-IN',
      triggerDistanceMeters: 300,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (va: VoiceAnnouncement) => {
    sound.playClick();
    setEditingId(va.id);
    setFormData({
      routeId: va.routeId,
      stopId: va.stopId,
      stopName: va.stopName,
      text: va.text,
      textTamil: va.textTamil || '',
      language: va.language,
      triggerDistanceMeters: va.triggerDistanceMeters || 300,
      isActive: va.isActive,
    });
    setIsModalOpen(true);
  };

  const handleRouteChange = (rId: string) => {
    const route = routes.find(r => r.id === rId);
    const stop = route?.stops?.[0] || stops[0];
    setFormData(prev => ({
      ...prev,
      routeId: rId,
      stopId: stop?.id || '',
      stopName: stop?.name || '',
      text: `The next stop is ${stop?.name || 'Upcoming Stop'}.`,
    }));
  };

  const handleStopChange = (sId: string) => {
    const stop = stops.find(s => s.id === sId);
    if (stop) {
      setFormData(prev => ({
        ...prev,
        stopId: stop.id,
        stopName: stop.name,
        text: `The next stop is ${stop.name}.`,
        textTamil: `அடுத்த நிறுத்தம் ${stop.shortName || stop.name}.`,
      }));
    }
  };

  const handleTestAudio = (text: string, id: string) => {
    sound.playClick();
    setIsPlayingAudio(id);

    gracefulVoice.speakDirectly(text);

    setTimeout(() => {
      setIsPlayingAudio(null);
    }, 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim()) return;

    sound.playClick();
    try {
      if (editingId) {
        await busApiService.updateAnnouncement(editingId, formData);
        setStatusMessage(`Announcement for "${formData.stopName}" updated.`);
      } else {
        await busApiService.addAnnouncement(formData);
        setStatusMessage(`Voice announcement deployed for "${formData.stopName}". Synced to API & APK.`);
      }

      sound.playSuccess();
      setIsModalOpen(false);
      onRefresh();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Error saving announcement: ${err.message}`);
    }
  };

  const handleDelete = async (va: VoiceAnnouncement) => {
    if (!window.confirm(`Delete announcement for "${va.stopName}"?`)) return;

    sound.playClick();
    try {
      await busApiService.deleteAnnouncement(va.id);
      sound.playSuccess();
      setStatusMessage(`Announcement deleted.`);
      onRefresh();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(`Error deleting announcement: ${err.message}`);
    }
  };

  const handleToggleActive = async (va: VoiceAnnouncement) => {
    sound.playClick();
    try {
      await busApiService.updateAnnouncement(va.id, { isActive: !va.isActive });
      onRefresh();
    } catch (e: any) {
      console.error(e);
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
            <Volume2 className="w-5 h-5 text-cyan-400" />
            <span>Voice Announcement Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure automated stop proximity voice alerts triggered when buses approach mapped stops.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black tracking-wide flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>NEW ANNOUNCEMENT</span>
        </button>
      </div>

      {/* Announcements List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.length === 0 ? (
          <div className="col-span-2 p-10 text-center rounded-2xl bg-white/[0.03] border border-white/10 text-slate-400 text-xs">
            No voice announcements configured yet. Click "New Announcement" to create one.
          </div>
        ) : (
          announcements.map((va) => (
            <div
              key={va.id}
              className={`p-5 rounded-2xl border transition-all ${
                va.isActive
                  ? 'bg-white/[0.04] border-white/10 hover:border-cyan-500/30'
                  : 'bg-white/[0.01] border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">{va.stopName}</span>
                    <button
                      onClick={() => handleToggleActive(va)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer ${
                        va.isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}
                    >
                      {va.isActive ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono mt-0.5 block">
                    Trigger Radius: ~{va.triggerDistanceMeters || 300}m
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTestAudio(va.text, va.id)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      isPlayingAudio === va.id
                        ? 'bg-cyan-500 text-black border-cyan-400 animate-pulse'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-cyan-400 border-white/10'
                    }`}
                    title="Play voice preview"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(va)}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Edit announcement"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(va)}
                    className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-colors cursor-pointer"
                    title="Delete announcement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text content preview */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  "{va.text}"
                </p>
                {va.textTamil && (
                  <p className="text-xs text-slate-400 font-sans border-t border-white/5 pt-1.5">
                    "{va.textTamil}"
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT ANNOUNCEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl my-6 bg-[#0B132B] border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.25)] text-white">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingId ? 'Edit Voice Announcement' : 'Deploy Voice Announcement'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Maps automated spoken alerts to stop coordinates
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

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                    Target Route
                  </label>
                  <select
                    value={formData.routeId}
                    onChange={(e) => handleRouteChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                    Associated Bus Stop
                  </label>
                  <select
                    value={formData.stopId}
                    onChange={(e) => handleStopChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {stops
                      .filter(s => !formData.routeId || s.routeId === formData.routeId)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          #{s.sequence || 1} {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Announcement Text (English) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder='e.g. "The next stop is Tambaram."'
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-cyan-400 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Announcement Text (Tamil Translation - Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder='e.g. "அடுத்த நிறுத்தம் தாம்பரம்."'
                  value={formData.textTamil}
                  onChange={(e) => setFormData({ ...formData, textTamil: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                    Proximity Trigger Distance
                  </label>
                  <select
                    value={formData.triggerDistanceMeters}
                    onChange={(e) => setFormData({ ...formData, triggerDistanceMeters: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    <option value={200}>200 Meters Before Stop</option>
                    <option value={300}>300 Meters Before Stop (Recommended)</option>
                    <option value={500}>500 Meters Before Stop</option>
                    <option value={1000}>1 Kilometer Before Stop</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                    Status
                  </label>
                  <label className="flex items-center gap-2 pt-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                    />
                    <span>Active Voice Alert</span>
                  </label>
                </div>
              </div>

              {/* Test Audio Button inside form */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTestAudio(formData.text, 'form-preview')}
                  className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-400 font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Test Speak TTS Voice</span>
                </button>
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all cursor-pointer"
                >
                  {editingId ? 'Update Announcement' : 'Deploy Voice Announcement'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
