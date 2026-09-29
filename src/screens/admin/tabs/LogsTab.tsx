import React, { useState } from 'react';
import type { ActivityLog } from '../../../types/bus';
import { ShieldCheck, Search } from 'lucide-react';

interface LogsTabProps {
  logs: ActivityLog[];
}

export const LogsTab: React.FC<LogsTabProps> = ({ logs }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.target.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase()) ||
    l.adminName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Administrator Security Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic ledger tracking all route modifications, bus additions, stop edits, and resolutions.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity by action or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/10 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Action Code</th>
                <th className="p-3.5">Administrator</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">Action Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                    No activity logs recorded.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-bold text-[10px] border border-cyan-400/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-200">
                      {log.adminName}
                    </td>
                    <td className="p-3.5 text-amber-400 font-semibold">
                      {log.target}
                    </td>
                    <td className="p-3.5 text-slate-300 font-sans text-xs">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
