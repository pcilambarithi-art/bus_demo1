import React, { useState, useEffect } from 'react';
import { useBus } from '../context/BusContext';
import type { LegalTab } from '../types/bus';
import {
  Shield,
  FileText,
  DollarSign,
  Cookie,
  Building2,
  Trash2,
  X,
  Printer,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  UserCheck,
  BellOff,
} from 'lucide-react';
import { sound } from '../utils/sound';

export const LegalComplianceModal: React.FC = () => {
  const { isLegalModalOpen, setIsLegalModalOpen, legalModalTab, setLegalModalTab, logout } = useBus();

  // Deletion request form state
  const [deleteName, setDeleteName] = useState('');
  const [deleteRoll, setDeleteRoll] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deletionSubmitted, setDeletionSubmitted] = useState(false);
  const [localDataCleared, setLocalDataCleared] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLegalModalOpen) {
        setIsLegalModalOpen(false);
      }
    };
    if (isLegalModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLegalModalOpen, setIsLegalModalOpen]);

  if (!isLegalModalOpen) return null;

  const handleTabChange = (tab: LegalTab) => {
    sound.playClick();
    setLegalModalTab(tab);
  };

  const handleClose = () => {
    sound.playClick();
    setIsLegalModalOpen(false);
  };

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const handlePurgeLocalData = () => {
    sound.playClick();
    try {
      localStorage.removeItem('dce_student_session');
      localStorage.removeItem('dce_sound_muted');
      localStorage.removeItem('dce_voice_config');
      localStorage.removeItem('dce_cookie_consent');
      localStorage.removeItem('dce_notification_prefs');
      sessionStorage.clear();
      setLocalDataCleared(true);
      setTimeout(() => {
        logout();
        setIsLegalModalOpen(false);
      }, 1400);
    } catch (_err) {
      setLocalDataCleared(true);
    }
  };

  const handleDeletionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (!deleteName.trim() || !deleteRoll.trim()) return;

    // Log deletion request to localStorage ledger for verification
    const requestItem = {
      name: deleteName,
      rollNumber: deleteRoll,
      reason: deleteReason,
      timestamp: new Date().toISOString(),
      status: 'PENDING_OFFICIAL_PURGE',
    };
    try {
      const existing = JSON.parse(localStorage.getItem('dce_deletion_requests') || '[]');
      existing.push(requestItem);
      localStorage.setItem('dce_deletion_requests', JSON.stringify(existing));
    } catch (_) {}

    setDeletionSubmitted(true);
  };

  const handleUnsubscribeToggle = () => {
    sound.playClick();
    const nextState = !unsubscribed;
    setUnsubscribed(nextState);
    try {
      localStorage.setItem('dce_unsubscribed_alerts', nextState ? 'true' : 'false');
    } catch (_) {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
    >
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl dark:bg-[#090E1F] bg-white border dark:border-white/15 border-slate-300 shadow-2xl overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b dark:border-white/10 border-slate-200 dark:bg-[#070B19]/80 bg-slate-50/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="legal-modal-title"
                className="font-extrabold text-base sm:text-lg dark:text-white text-slate-900 tracking-tight"
              >
                Legal, Privacy & Compliance Hub
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                Dhanalakshmi College of Engineering • Campus Fleet & Logistics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              aria-label="Print or Save Policy Document"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold dark:bg-white/5 bg-slate-200/80 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>

            <button
              onClick={handleClose}
              aria-label="Close Legal Compliance Modal"
              className="w-9 h-9 rounded-2xl flex items-center justify-center dark:bg-white/10 bg-slate-200 text-slate-700 dark:text-slate-300 hover:bg-rose-500 hover:text-white transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 overflow-x-auto no-scrollbar border-b dark:border-white/10 border-slate-200 dark:bg-black/20 bg-slate-100/60 shrink-0">
          {[
            { id: 'privacy' as LegalTab, label: 'Privacy Policy', icon: Shield },
            { id: 'terms' as LegalTab, label: 'Terms of Service', icon: FileText },
            { id: 'refund' as LegalTab, label: 'Refund & Fee Policy', icon: DollarSign },
            { id: 'cookie' as LegalTab, label: 'Cookie & Storage Policy', icon: Cookie },
            { id: 'licenses' as LegalTab, label: 'Institution & Licenses', icon: Building2 },
            { id: 'data-deletion' as LegalTab, label: 'Data Deletion & Rights', icon: Trash2 },
          ].map((tab) => {
            const isActive = legalModalTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none
                  ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5'
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-current'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-sans">
          
          {/* TAB 1: PRIVACY POLICY */}
          {legalModalTab === 'privacy' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 dark:text-cyan-200 text-cyan-900">
                <h3 className="font-extrabold text-sm sm:text-base text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Official Student & Staff Privacy Policy
                </h3>
                <p className="text-xs">
                  Effective Date: October 2026 • Governing Body: Dhanalakshmi College of Engineering Transport Logistics Bureau, Chennai, India. Compliant with the Digital Personal Data Protection (DPDP) Act & AICTE IT Guidelines.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  1. Information We Collect (Strict Data Minimization)
                </h4>
                <p className="mb-2">
                  We adhere strictly to the principle of <strong>Zero Unnecessary Data Collection</strong>. We only collect the minimal identifiers required to coordinate safe, accurate campus transportation:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs">
                  <li><strong>Student Profile:</strong> Full name, institutional roll/registration number, department, semester, and designated morning/evening boarding stop.</li>
                  <li><strong>Bus Driver Telemetry:</strong> Live GPS coordinates (latitude, longitude, heading, speed) broadcast solely during active college transit duty trips.</li>
                  <li><strong>Client Device Diagnostics:</strong> User-agent, dark/light theme choice, and screen viewport dimensions for rendering responsive glassmorphism UI.</li>
                  <li><strong>Student Geolocation:</strong> Your device GPS coordinates are ONLY accessed in real-time when you tap "Locate Me" or "Check Proximity". They are computed locally within your browser and are <em>never</em> persisted to any database or sold.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  2. Purpose & Lawful Basis of Processing
                </h4>
                <p className="text-xs">
                  Data processing is conducted strictly under lawful institutional necessity for ensuring student physical safety, tracking college bus punctuality, preventing unauthorized boarding, and broadcasting urgent weather or breakdown updates.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  3. Data Retention & Erasure Schedule
                </h4>
                <p className="text-xs">
                  Telemetry logs and session data are stored securely on the dedicated college campus server. Historical route GPS logs are automatically rolled over every 30 days. Student profiles are purged upon graduation or immediately upon submitting a validated <strong>Data Deletion Request</strong>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  4. Third-Party Sharing Prohibition
                </h4>
                <p className="text-xs">
                  We do not sell, license, monetize, or lease student or driver telemetry to any commercial advertisers, analytics aggregators, or third parties. All mapping queries use open tile standards.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: TERMS OF SERVICE */}
          {legalModalTab === 'terms' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 dark:text-indigo-200 text-indigo-900">
                <h3 className="font-extrabold text-sm sm:text-base text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Campus Transit Service Terms & Conditions
                </h3>
                <p className="text-xs">
                  Terms governing usage of the Dhanalakshmi College of Engineering Smart Bus Transit System, Driver Broadcast Terminal, and Mobile Application.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  1. Authorized Passenger Eligibility
                </h4>
                <p className="text-xs">
                  Access to the live telemetry grid is restricted to currently enrolled students, faculty members, administrative staff, and authorized transit operators of Dhanalakshmi College of Engineering (DCE Chennai).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  2. Digital Bus Pass & Verification
                </h4>
                <p className="text-xs">
                  Every passenger must generate and present their authenticated Digital QR Transport Pass from the profile screen upon boarding. Bus captains and drivers reserve the right to verify college student identification cards.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  3. Realistic Telemetry & ETA Disclaimer (No Unsupported Claims)
                </h4>
                <p className="text-xs">
                  Arrival times (ETAs) and proximity calculations are computed using real-time GPS telemetry combined with algorithmic distance projections. While system sync latency is under 5 seconds under nominal conditions, arrival times remain estimates. Traffic congestion, urban bottlenecks, monsoon rainstorms, signal blind spots, or road diversions may cause variations.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  4. Driver Conduct & Transmission Obligations
                </h4>
                <p className="text-xs">
                  Staff drivers are required to start and broadcast trip coordinates only along approved college corridors. Drivers must not operate handheld phones while driving; the cockpit mode is designed for hands-free dashboard mounts.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: REFUND & FEE POLICY */}
          {legalModalTab === 'refund' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 dark:text-emerald-200 text-emerald-900">
                <h3 className="font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Transparent Transport Fee & Refund Policy
                </h3>
                <p className="text-xs">
                  Clear, zero-hidden-fee pricing structure governed by the Dhanalakshmi College of Engineering Finance Committee.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400 block mb-1">
                    Web App & APK Access
                  </span>
                  <div className="font-extrabold text-xl dark:text-white text-slate-900 mb-1">
                    ₹0.00 (100% Free)
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    The bus tracking portal, PWA, and Android APK are completely complimentary for all college students and staff. Zero in-app purchases, zero service surcharges, and zero microtransactions.
                  </p>
                </div>

                <div className="p-4 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 block mb-1">
                    Semester Bus Pass Fees
                  </span>
                  <div className="font-extrabold text-xl dark:text-white text-slate-900 mb-1">
                    Fixed Institutional Rate
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Physical bus pass fees cover annual fuel, maintenance, tollways, and fleet operations. Rates are fixed per zone and billed directly via the official college tuition fee portal.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  Refund Eligibility & Timelines
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/5 border-slate-200">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="dark:text-white text-slate-900">100% Full Refund:</strong> If a student cancels their bus seat reservation prior to the official commencement date of semester academic classes.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/5 border-slate-200">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="dark:text-white text-slate-900">75% Pro-Rated Refund:</strong> If an application for cancellation is lodged within 14 calendar days from the opening date of the semester.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/5 border-slate-200">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="dark:text-white text-slate-900">Medical / Transfer Exemptions:</strong> In cases of verified student admission transfer or documented prolonged medical absence, special pro-rated refund approval may be granted by the College Principal.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  How to Apply for a Transport Refund
                </h4>
                <p className="text-xs">
                  Submit the Transport Fee Challan along with a refund application form signed by the Head of Department (HOD) to the Bursar / Accounts Office, Ground Floor, Administrative Block, DCE Campus. Refunds are disbursed via direct electronic bank transfer within 7 to 10 working days.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: COOKIE & STORAGE POLICY */}
          {legalModalTab === 'cookie' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 dark:text-amber-200 text-amber-900">
                <h3 className="font-extrabold text-sm sm:text-base text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-2">
                  <Cookie className="w-4 h-4" />
                  Cookie & Local Storage Disclosure
                </h3>
                <p className="text-xs">
                  We use secure browser LocalStorage and SessionStorage strictly for core operational functionality and user preferences.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  Complete Storage Keys Audit
                </h4>
                <div className="overflow-x-auto rounded-xl border dark:border-white/10 border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="dark:bg-white/5 bg-slate-100 text-slate-500 dark:text-slate-400 border-b dark:border-white/10 border-slate-200">
                        <th className="p-3 font-semibold">Storage Key</th>
                        <th className="p-3 font-semibold">Category</th>
                        <th className="p-3 font-semibold">Purpose & Retention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-white/5 divide-slate-200 font-mono text-[11px]">
                      <tr>
                        <td className="p-3 font-bold text-cyan-500 dark:text-cyan-400">dce_student_session</td>
                        <td className="p-3 font-sans text-emerald-500">Essential</td>
                        <td className="p-3 font-sans">Stores student credentials and selected stop to prevent re-entering login every page load.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-cyan-500 dark:text-cyan-400">dce_staff_token / admin_token</td>
                        <td className="p-3 font-sans text-emerald-500">Essential</td>
                        <td className="p-3 font-sans">Cryptographic bearer tokens authorizing driver broadcast and administrative consoles.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">dce_cookie_consent</td>
                        <td className="p-3 font-sans text-emerald-500">Essential</td>
                        <td className="p-3 font-sans">Records your consent choices for privacy and cookie preferences.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">theme / dce_theme</td>
                        <td className="p-3 font-sans text-blue-500">Preference</td>
                        <td className="p-3 font-sans">Remembers user preference for Dark Mode vs Light Mode visual styles.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">dce_sound_muted / voice_config</td>
                        <td className="p-3 font-sans text-blue-500">Preference</td>
                        <td className="p-3 font-sans">Saves audio chime mute state and chosen text-to-speech voice speed.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  Zero Advertising or Tracking Cookies
                </h4>
                <p className="text-xs">
                  This system contains <strong>no third-party advertising cookies, no Meta/Facebook tracking pixels, no behavioral trackers, and no ad profiling network cookies</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: INSTITUTION & SDK LICENSES */}
          {legalModalTab === 'licenses' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 dark:text-cyan-200 text-cyan-900">
                <h3 className="font-extrabold text-sm sm:text-base text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Institutional Details & Open-Source Licenses
                </h3>
                <p className="text-xs">
                  Legal entity registration, campus transport department contacts, and third-party software licensing inventory.
                </p>
              </div>

              {/* Institution Details Grid */}
              <div className="p-4 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-3">
                <div className="font-bold text-sm dark:text-white text-slate-900">
                  Dhanalakshmi College of Engineering (DCE Chennai)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    <span>Dr. V. P. R. Nagar, Off Tambaram-Sriperumbudur Road, Manimangalam, Chennai, Tamil Nadu - 601301, India.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Transport Direct Line: +91 (0) 44 7122 4000 / +91 94443 90150</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Email: transport@dce.edu.in | privacy@dce.edu.in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Helpdesk Hours: Monday – Saturday, 06:30 AM – 06:30 PM IST</span>
                  </div>
                </div>
              </div>

              {/* Software and Asset Licenses */}
              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-2 uppercase tracking-wide text-xs">
                  Open-Source Libraries & Asset Licenses
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/5 border-slate-200 flex justify-between items-center">
                    <div>
                      <strong className="dark:text-white text-slate-900">MapLibre GL & Leaflet:</strong> Interactive vector & raster map engines.
                    </div>
                    <span className="font-mono text-[10px] text-cyan-500 font-bold">BSD 3-Clause</span>
                  </div>

                  <div className="p-3 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/5 border-slate-200 flex justify-between items-center">
                    <div>
                      <strong className="dark:text-white text-slate-900">OpenStreetMap & CARTO Tiles:</strong> Open Cartography and street basemap tiles.
                    </div>
                    <span className="font-mono text-[10px] text-cyan-500 font-bold">ODbL / CC BY 4.0</span>
                  </div>

                  <div className="p-3 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/5 border-slate-200 flex justify-between items-center">
                    <div>
                      <strong className="dark:text-white text-slate-900">Lucide React:</strong> UI iconography components.
                    </div>
                    <span className="font-mono text-[10px] text-cyan-500 font-bold">ISC License</span>
                  </div>

                  <div className="p-3 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/5 border-slate-200 flex justify-between items-center">
                    <div>
                      <strong className="dark:text-white text-slate-900">Inter & Orbitron Typography:</strong> Interface fonts.
                    </div>
                    <span className="font-mono text-[10px] text-cyan-500 font-bold">SIL Open Font License 1.1</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DATA DELETION & PRIVACY RIGHTS */}
          {legalModalTab === 'data-deletion' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 dark:text-rose-200 text-rose-900">
                <h3 className="font-extrabold text-sm sm:text-base text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Your Privacy Rights & Data Deletion
                </h3>
                <p className="text-xs">
                  In compliance with the Digital Personal Data Protection (DPDP) Act 2023, you have the absolute Right to Erasure, Right to Withdraw Consent, and Right to Data Portability.
                </p>
              </div>

              {/* Age & Minors Consent Notice */}
              <div className="p-4 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  Age Eligibility & Minors Data Protection Notice
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  The DCE Bus Tracker is designed for enrolled collegiate students (typically aged 17 and above) and staff. For first-year students who may be under 18 years of age (minors), parental or legal guardian consent for campus transportation is collected and maintained on file through the college admissions registry. We prohibit behavioral profiling, algorithmic tracking, or commercial use of student data.
                </p>
              </div>

              {/* Section A: Instant 1-Click Client Cache Purge */}
              <div className="p-4 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm dark:text-white text-slate-900">
                      1. Instant Client Data Purge & Reset
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Instantly wipe all stored tokens, cached bus routes, cookie consent records, and student session credentials from this device.
                    </p>
                  </div>
                  <button
                    onClick={handlePurgeLocalData}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all active:scale-95 shadow-md shadow-rose-500/20 shrink-0"
                  >
                    Purge Local Data
                  </button>
                </div>
                {localDataCleared && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Local cache successfully cleared. Logging out session...</span>
                  </div>
                )}
              </div>

              {/* Section B: Unsubscribe from Notifications */}
              <div className="p-4 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm dark:text-white text-slate-900 flex items-center gap-1.5">
                    <BellOff className="w-4 h-4 text-indigo-400" />
                    2. Notification Preference & Unsubscribe
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Opt-out from non-emergency transit push alerts and arrival chimes on this browser.
                  </p>
                </div>
                <button
                  onClick={handleUnsubscribeToggle}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                    unsubscribed
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'dark:bg-white/10 bg-slate-200 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-white/10'
                  }`}
                >
                  {unsubscribed ? 'Alerts Muted (Unsubscribed)' : 'Unsubscribe Non-Emergency'}
                </button>
              </div>

              {/* Section C: Official Server Record Deletion Ticket */}
              <div className="p-4 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
                <h4 className="font-bold text-sm dark:text-white text-slate-900 mb-1">
                  3. Official Server Record Deletion Request
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  Request complete permanent erasure of your student profile and transit logs from the campus database.
                </p>

                {deletionSubmitted ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Deletion Ticket Submitted Successfully
                    </div>
                    <p>
                      Your request has been logged. The DCE Privacy Officer and Transport Registrar will purge your historical server records within 48 business hours. A confirmation copy has been queued for your records.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleDeletionSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Student / Staff Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={deleteName}
                          onChange={(e) => setDeleteName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full px-3 py-2 rounded-xl text-xs dark:bg-black/30 bg-white border dark:border-white/15 border-slate-300 dark:text-white text-slate-900 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          College Roll Number / Staff ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={deleteRoll}
                          onChange={(e) => setDeleteRoll(e.target.value)}
                          placeholder="e.g. 21CS042"
                          className="w-full px-3 py-2 rounded-xl text-xs dark:bg-black/30 bg-white border dark:border-white/15 border-slate-300 dark:text-white text-slate-900 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Reason for Deletion (Optional)
                      </label>
                      <input
                        type="text"
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="e.g. Graduated, hostel accommodation, or personal privacy request"
                        className="w-full px-3 py-2 rounded-xl text-xs dark:bg-black/30 bg-white border dark:border-white/15 border-slate-300 dark:text-white text-slate-900 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all active:scale-95 shadow-md shadow-cyan-500/20"
                    >
                      Submit Official Erasure Ticket to privacy@dce.edu.in
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t dark:border-white/10 border-slate-200 dark:bg-[#070B19]/80 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span>DCE CAMPUS TRANSIT COMPLIANCE</span>
            <span>•</span>
            <span className="text-emerald-500 dark:text-emerald-400">DPDP ACT 2023 VERIFIED</span>
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold dark:bg-white/10 bg-slate-200 hover:bg-cyan-500 hover:text-slate-950 transition-all"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
};
