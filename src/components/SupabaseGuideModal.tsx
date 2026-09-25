import React, { useState } from 'react';
import { Database, Copy, Check, X, Key, Layers } from 'lucide-react';
import { isConfigured, SUPABASE_SQL_SCHEMA, getLocalRegistrations } from '../services/supabase';
import { sound } from '../utils/audio';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'records'>('setup');
  const localRecords = getLocalRegistrations();

  if (!isOpen) return null;

  const handleCopySchema = () => {
    sound.playClick();
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => {
          sound.playClick();
          onClose();
        }}
      />

      <div className="relative w-full max-w-2xl my-6 bg-cyber-950 border border-cyber-cyan/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden z-10 font-mono">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-cyber-900 border-b border-cyber-cyan/20">
          <div className="flex items-center gap-2 text-xs text-white">
            <Database className="w-4 h-4 text-cyber-cyan" />
            <span className="font-bold">DATABASE TELEMETRY & SUPABASE CONFIG</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/10 bg-cyber-900/50 text-xs">
          <button
            onClick={() => setActiveTab('setup')}
            className={`flex-1 py-3 px-4 font-bold tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'setup'
                ? 'border-cyber-cyan text-cyber-cyan bg-cyber-cyan/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>CONNECT SUPABASE CLOUD</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`flex-1 py-3 px-4 font-bold tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'records'
                ? 'border-cyber-violet text-cyber-violet bg-cyber-violet/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>STORED REGISTRATIONS ({localRecords.length})</span>
          </button>
        </div>

        {/* Tab 1: Setup Instructions */}
        {activeTab === 'setup' && (
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5 text-xs text-slate-300">
            {/* Status Indicator */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isConfigured
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-cyber-900 border-cyber-cyan/30 text-cyber-cyan'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                <span>
                  STATUS: <strong>{isConfigured ? 'CONNECTED TO SUPABASE' : 'OPERATING IN LOCAL VAULT MODE'}</strong>
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {isConfigured ? 'Active Cloud Sync' : 'Zero Setup Required (Works out of box)'}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="font-orbitron font-bold text-white text-sm">
                How to connect your live Supabase project:
              </h4>
              <ol className="space-y-2 pl-4 list-decimal text-slate-300 font-sans">
                <li>Create a free project at <strong className="text-cyber-cyan">supabase.com</strong>.</li>
                <li>Go to the <strong>SQL Editor</strong> in your Supabase dashboard and run the script below.</li>
                <li>Create a <code className="text-cyber-cyan bg-cyber-900 px-1 py-0.5 rounded">.env</code> file in the project root with:</li>
              </ol>
            </div>

            {/* Code Snippet for .env */}
            <div className="p-3 rounded-lg bg-black border border-cyber-cyan/30 text-cyber-cyan font-mono text-[11px] select-all">
              VITE_SUPABASE_URL=https://your-project-id.supabase.co<br />
              VITE_SUPABASE_ANON_KEY=your-anon-public-key
            </div>

            {/* SQL Table Creation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-orbitron text-xs text-white">SUPABASE SQL TABLE CREATION</span>
                <button
                  onClick={handleCopySchema}
                  className="px-3 py-1 rounded bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan hover:text-black flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY SQL'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-lg bg-black/90 border border-white/10 text-[10px] text-slate-400 overflow-x-auto max-h-40">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: Stored Registrations */}
        {activeTab === 'records' && (
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-xs">
            {localRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono">
                NO PARTICIPANTS RECORDED YET IN THE CURRENT VAULT.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>TOTAL STORED ENTRIES: {localRecords.length}</span>
                  <span className="text-cyber-cyan">ENCRYPTED LOCALLY</span>
                </div>

                {localRecords.map((rec) => (
                  <div key={rec.registrationId} className="p-3 rounded-xl bg-cyber-900 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between text-white font-bold">
                      <span className="text-cyber-cyan">{rec.registrationId}</span>
                      <span className="text-xs text-cyber-violet">{rec.eventId.toUpperCase()}</span>
                    </div>
                    <div className="text-slate-300">
                      {rec.fullName} ({rec.email})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {rec.collegeName} • {rec.department} ({rec.yearOfStudy})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
