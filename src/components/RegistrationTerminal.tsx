import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Terminal, ShieldCheck, CheckCircle, X, Download, Plus, 
  Trash2, User, Mail, Phone, School, Cpu, Users, 
  RefreshCw
} from 'lucide-react';
import { EVENTS_DATA, getStoredEvents } from '../data/eventsData';
import type { RegistrationFormData, RegistrationRecord } from '../types';
import { saveRegistration } from '../services/supabase';
import { sound } from '../utils/audio';

interface RegistrationTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEventId?: string;
}

type TerminalStep = 'form' | 'success';

export const RegistrationTerminal: React.FC<RegistrationTerminalProps> = ({
  isOpen,
  onClose,
  preselectedEventId,
}) => {
  const [eventsList, setEventsList] = useState(() => getStoredEvents());
  const [step, setStep] = useState<TerminalStep>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState<RegistrationRecord | null>(null);

  useEffect(() => {
    const handleEventsUpdate = () => {
      setEventsList(getStoredEvents());
    };
    window.addEventListener('systech_events_updated', handleEventsUpdate);
    return () => window.removeEventListener('systech_events_updated', handleEventsUpdate);
  }, []);

  // Form state
  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: '',
    email: '',
    phone: '',
    collegeName: '',
    department: '',
    yearOfStudy: '3rd Year',
    eventId: preselectedEventId || getStoredEvents()[0]?.id || 'cyber-ctf',
    participationType: 'Individual',
    teamName: '',
    teamMembers: [''],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // When preselected event changes, update eventId and adjust participation type
  useEffect(() => {
    if (preselectedEventId) {
      const selected = eventsList.find(e => e.id === preselectedEventId);
      const isTeam = selected ? selected.teamMin > 1 : false;
      setFormData(prev => ({
        ...prev,
        eventId: preselectedEventId,
        participationType: isTeam ? 'Team' : 'Individual',
      }));
    }
  }, [preselectedEventId, eventsList]);

  // Reset to form step when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('form');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentEvent = eventsList.find(e => e.id === formData.eventId) || eventsList[0] || EVENTS_DATA[0];
  const requiresTeam = currentEvent ? currentEvent.teamMin > 1 : false;

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) errors.fullName = 'Full Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email format';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9]{10,13}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'Enter valid 10-digit mobile number';
    }

    if (!formData.collegeName.trim()) errors.collegeName = 'College name is required';
    if (!formData.department.trim()) errors.department = 'Department is required';

    if (formData.participationType === 'Team') {
      if (!formData.teamName?.trim()) {
        errors.teamName = 'Team name is required';
      }

      const validMembers = formData.teamMembers?.filter(m => m.trim().length > 0) || [];
      const totalTeamSize = validMembers.length + 1; // leader + members

      if (currentEvent && totalTeamSize < currentEvent.teamMin) {
        errors.teamMembers = `Minimum ${currentEvent.teamMin} members required for ${currentEvent.name}`;
      } else if (currentEvent && totalTeamSize > currentEvent.teamMax) {
        errors.teamMembers = `Maximum ${currentEvent.teamMax} members permitted for ${currentEvent.name}`;
      }
    }

    if (!formData.paymentScreenshot) {
      errors.paymentScreenshot = 'Payment screenshot is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof RegistrationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleEventChange = (newId: string) => {
    sound.playClick();
    const evt = eventsList.find(e => e.id === newId);
    const isTeam = evt ? evt.teamMin > 1 : false;
    setFormData(prev => ({
      ...prev,
      eventId: newId,
      participationType: isTeam ? 'Team' : 'Individual',
    }));
  };

  const addTeamMember = () => {
    sound.playClick();
    if ((formData.teamMembers?.length || 0) < currentEvent.teamMax - 1) {
      setFormData(prev => ({
        ...prev,
        teamMembers: [...(prev.teamMembers || []), ''],
      }));
    }
  };

  const removeTeamMember = (index: number) => {
    sound.playClick();
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers?.filter((_, i) => i !== index),
    }));
  };

  const updateTeamMember = (index: number, val: string) => {
    setFormData(prev => {
      const updated = [...(prev.teamMembers || [])];
      updated[index] = val;
      return { ...prev, teamMembers: updated };
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      sound.playClick();
      return;
    }

    setIsSubmitting(true);
    sound.playClick();

    // Generate unique ID: SYSTECH27-XXXXXX (6 random uppercase alphanumeric hex chars)
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const regId = `SYSTECH27-${randomHex}`;

    const record: RegistrationRecord = {
      ...formData,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      registrationId: regId,
      createdAt: new Date().toISOString(),
      status: 'CONFIRMED',
      qrPayload: JSON.stringify({
        id: regId,
        name: formData.fullName,
        event: currentEvent.name,
        college: formData.collegeName,
        type: formData.participationType,
        team: formData.teamName || 'N/A',
        timestamp: Date.now(),
        issuer: 'SYSTECH2K27-GRID-AUTHORITY'
      }),
    };

    await saveRegistration(record);
    setConfirmedRecord(record);
    setIsSubmitting(false);
    setStep('success');

    // Trigger celebration chime & confetti
    sound.playAccessGranted();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00f0ff', '#8b5cf6', '#3b82f6', '#ffffff']
    });
  };

  // Trigger browser print for saving pass
  const handlePrintPass = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-lg transition-opacity duration-300"
        onClick={() => {
          sound.playClick();
          onClose();
        }}
      />

      {/* Cyber Terminal Window */}
      <div className="relative w-full max-w-2xl my-6 bg-cyber-950/95 border border-cyber-cyan/40 rounded-2xl shadow-[0_0_60px_rgba(0,240,255,0.25)] overflow-hidden z-10 font-mono">
        
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-cyber-900 border-b border-cyber-cyan/25 select-none">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>TERMINAL // SECURE REGISTRATION CONSOLE</span>
            </span>
          </div>

          <div className="flex items-center gap-3">


            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* REGISTRATION FORM */}
        {step === 'form' && eventsList.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-4 font-mono">
            <div className="w-12 h-12 rounded-xl bg-cyber-900 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan mx-auto">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-orbitron font-bold text-white text-base">NO EVENTS OPEN FOR REGISTRATION</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All symposium challenges have been deleted or closed. Please configure events in the Admin Command Center.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-cyber-cyan text-black font-bold text-xs cursor-pointer hover:opacity-90 transition-opacity"
            >
              CLOSE TERMINAL
            </button>
          </div>
        ) : step === 'form' && (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto space-y-5">
            
            {/* Header banner */}
            <div className="pb-3 border-b border-cyber-cyan/15 flex items-center justify-between">
              <div>
                <h3 className="font-orbitron font-bold text-lg text-white">
                  OPERATIVE CREDENTIAL ENROLLMENT
                </h3>
                <p className="text-xs text-slate-400">
                  Provide verified academic telemetry to secure your physical clearance.
                </p>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded">
                SECURE 256-BIT
              </span>
            </div>

            {/* Event Selection */}
            <div>
              <label className="block text-xs text-cyber-cyan uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>SELECT TARGET EVENT *</span>
              </label>
              <select
                value={formData.eventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-900 border border-cyber-cyan/30 text-slate-200 text-xs focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan transition-all"
              >
                {eventsList.map((evt) => (
                  <option key={evt.id} value={evt.id} className="bg-cyber-950 text-white">
                    #{evt.number} - {evt.name} ({evt.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Personal Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-cyber-cyan" />
                  <span>FULL NAME *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Mercer"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-cyber-900 border text-xs text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                    formErrors.fullName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-cyber-cyan/20 focus:border-cyber-cyan'
                  }`}
                />
                {formErrors.fullName && (
                  <span className="text-[10px] text-rose-400 mt-1 block">[ERR] {formErrors.fullName}</span>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-cyber-cyan" />
                  <span>EMAIL ADDRESS *</span>
                </label>
                <input
                  type="email"
                  placeholder="alex.m@college.edu"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-cyber-900 border text-xs text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                    formErrors.email ? 'border-rose-500 ring-1 ring-rose-500' : 'border-cyber-cyan/20 focus:border-cyber-cyan'
                  }`}
                />
                {formErrors.email && (
                  <span className="text-[10px] text-rose-400 mt-1 block">[ERR] {formErrors.email}</span>
                )}
              </div>
            </div>

            {/* Phone & College */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-cyber-cyan" />
                  <span>PHONE NUMBER *</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-cyber-900 border text-xs text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                    formErrors.phone ? 'border-rose-500 ring-1 ring-rose-500' : 'border-cyber-cyan/20 focus:border-cyber-cyan'
                  }`}
                />
                {formErrors.phone && (
                  <span className="text-[10px] text-rose-400 mt-1 block">[ERR] {formErrors.phone}</span>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                  <School className="w-3 h-3 text-cyber-cyan" />
                  <span>COLLEGE / INSTITUTION *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. National Institute of Tech"
                  value={formData.collegeName}
                  onChange={(e) => handleInputChange('collegeName', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-cyber-900 border text-xs text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                    formErrors.collegeName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-cyber-cyan/20 focus:border-cyber-cyan'
                  }`}
                />
                {formErrors.collegeName && (
                  <span className="text-[10px] text-rose-400 mt-1 block">[ERR] {formErrors.collegeName}</span>
                )}
              </div>
            </div>

            {/* Department & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">DEPARTMENT / STREAM *</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science / InfoSec"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-cyber-900 border text-xs text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                    formErrors.department ? 'border-rose-500 ring-1 ring-rose-500' : 'border-cyber-cyan/20 focus:border-cyber-cyan'
                  }`}
                />
                {formErrors.department && (
                  <span className="text-[10px] text-rose-400 mt-1 block">[ERR] {formErrors.department}</span>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">YEAR OF STUDY *</label>
                <select
                  value={formData.yearOfStudy}
                  onChange={(e) => handleInputChange('yearOfStudy', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-900 border border-cyber-cyan/20 text-white text-xs focus:outline-none focus:border-cyber-cyan"
                >
                  <option value="1st Year">1st Year (Freshman)</option>
                  <option value="2nd Year">2nd Year (Sophomore)</option>
                  <option value="3rd Year">3rd Year (Junior)</option>
                  <option value="4th Year">4th Year (Senior)</option>
                  <option value="Postgraduate">Postgraduate / Research</option>
                </select>
              </div>
            </div>

            {/* Participation Type (Individual vs Team) */}
            <div className="pt-2">
              <label className="block text-xs text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyber-violet" />
                <span>PARTICIPATION FORMAT</span>
              </label>
              <div className="flex gap-4">
                <label className={`flex-1 p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  formData.participationType === 'Individual'
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-white'
                    : 'bg-cyber-900/50 border-white/10 text-slate-400'
                } ${requiresTeam ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <span className="text-xs font-semibold">Individual Operative</span>
                  <input
                    type="radio"
                    name="participationType"
                    checked={formData.participationType === 'Individual'}
                    disabled={requiresTeam}
                    onChange={() => handleInputChange('participationType', 'Individual')}
                    className="accent-cyber-cyan"
                  />
                </label>

                <label className={`flex-1 p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  formData.participationType === 'Team'
                    ? 'bg-cyber-violet/15 border-cyber-violet text-white'
                    : 'bg-cyber-900/50 border-white/10 text-slate-400'
                } ${currentEvent.teamMax === 1 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <span className="text-xs font-semibold">Tactical Squad (Team)</span>
                  <input
                    type="radio"
                    name="participationType"
                    checked={formData.participationType === 'Team'}
                    disabled={currentEvent.teamMax === 1}
                    onChange={() => handleInputChange('participationType', 'Team')}
                    className="accent-cyber-violet"
                  />
                </label>
              </div>
            </div>

            {/* Team Fields when Team is selected */}
            {formData.participationType === 'Team' && (
              <div className="p-4 rounded-xl bg-cyber-900/60 border border-cyber-violet/30 space-y-3">
                <div>
                  <label className="block text-xs text-cyber-violet font-semibold mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CypherByte Syndicate"
                    value={formData.teamName}
                    onChange={(e) => handleInputChange('teamName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-cyber-950 border text-xs text-white placeholder:text-slate-600 focus:outline-none ${
                      formErrors.teamName ? 'border-rose-500' : 'border-cyber-violet/30 focus:border-cyber-violet'
                    }`}
                  />
                  {formErrors.teamName && (
                    <span className="text-[10px] text-rose-400 mt-1 block">[ERR] {formErrors.teamName}</span>
                  )}
                </div>

                {/* Additional squad members */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-300">
                      SQUAD OPERATIVES ({formData.teamMembers?.length || 0} / {currentEvent.teamMax - 1} additional)
                    </label>
                    {(formData.teamMembers?.length || 0) < currentEvent.teamMax - 1 && (
                      <button
                        type="button"
                        onClick={addTeamMember}
                        className="text-[11px] text-cyber-cyan hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Member</span>
                      </button>
                    )}
                  </div>

                  {formData.teamMembers?.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder={`Squad Member ${idx + 1} Full Name`}
                        value={member}
                        onChange={(e) => updateTeamMember(idx, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-cyber-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-violet"
                      />
                      <button
                        type="button"
                        onClick={() => removeTeamMember(idx)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {formErrors.teamMembers && (
                    <span className="text-[10px] text-rose-400">[ERR] {formErrors.teamMembers}</span>
                  )}
                </div>
              </div>
            )}

            {/* Payment QR Code Section */}
            <div className="pt-2 space-y-3">
              <div className="pb-1 border-b border-cyber-cyan/15">
                <h4 className="text-xs text-cyber-cyan uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <span>💳</span>
                  <span>PAYMENT VERIFICATION</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scan the QR code below to complete payment, then upload your payment screenshot.
                </p>
              </div>

              {/* QR Code Display */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-cyber-900/60 border border-cyber-cyan/20">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="p-2 bg-white rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                    <img
                      src="/payment-qr.jpg"
                      alt="Payment QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                  <span className="text-[10px] text-cyber-cyan font-mono tracking-wider">SCAN TO PAY</span>
                </div>
                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <p className="text-xs text-slate-300 font-semibold">Steps to complete payment:</p>
                  <ol className="text-[11px] text-slate-400 space-y-1 list-none">
                    <li className="flex items-start gap-1.5"><span className="text-cyber-cyan font-bold">01.</span> Open any UPI app (GPay, PhonePe, Paytm, etc.)</li>
                    <li className="flex items-start gap-1.5"><span className="text-cyber-cyan font-bold">02.</span> Scan the QR code to initiate payment</li>
                    <li className="flex items-start gap-1.5"><span className="text-cyber-cyan font-bold">03.</span> Complete the transaction</li>
                    <li className="flex items-start gap-1.5"><span className="text-cyber-cyan font-bold">04.</span> Take a screenshot of the success screen</li>
                    <li className="flex items-start gap-1.5"><span className="text-cyber-cyan font-bold">05.</span> Upload the screenshot below</li>
                  </ol>
                </div>
              </div>

              {/* Upload Screenshot Input */}
              <div>
                <label className="block text-xs text-slate-300 mb-1.5 flex items-center gap-1">
                  <span className="text-cyber-cyan">📎</span>
                  <span>UPLOAD PAYMENT SCREENSHOT *</span>
                </label>
                <label className={`flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  formErrors.paymentScreenshot
                    ? 'border-rose-500 bg-rose-950/10'
                    : formData.paymentScreenshot
                      ? 'border-emerald-500/60 bg-emerald-950/20'
                      : 'border-cyber-cyan/30 bg-cyber-900/40 hover:border-cyber-cyan/60 hover:bg-cyber-900/60'
                }`}>
                  {formData.paymentScreenshot ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-emerald-400 text-lg">✓</span>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        {(formData.paymentScreenshot as File).name}
                      </span>
                      <span className="text-[10px] text-slate-500">Click to change</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <span className="text-2xl">⬆</span>
                      <span className="text-[11px] font-mono">Click to upload screenshot</span>
                      <span className="text-[10px] text-slate-600">PNG, JPG, JPEG supported</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleInputChange('paymentScreenshot', file);
                    }}
                  />
                </label>
                {formErrors.paymentScreenshot && (
                  <span className="text-[10px] text-rose-400 mt-1 block">[ERR] {formErrors.paymentScreenshot}</span>
                )}
              </div>
            </div>

            {/* Submission CTA */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyber-cyan via-blue-500 to-cyber-violet text-black font-mono font-bold text-xs tracking-widest hover:shadow-neon-cyan active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>ENCRYPTING & TRANSMITTING TELEMETRY...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-black" />
                    <span>SUBMIT CREDENTIALS & GENERATE CYBER PASS</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

        {/* STAGE 3: ACCESS GRANTED & CYBER PASS TICKET */}
        {step === 'success' && confirmedRecord && (
          <div className="p-6 sm:p-8 max-h-[85vh] overflow-y-auto space-y-6">
            
            {/* Header Success Callout */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle className="w-8 h-8 text-emerald-400 animate-bounce" />
              </div>

              <h3 className="font-orbitron font-black text-2xl sm:text-3xl text-white tracking-wider">
                ACCESS GRANTED ✓
              </h3>
              <p className="font-mono text-xs sm:text-sm text-cyber-cyan tracking-widest uppercase">
                REGISTRATION SUCCESSFUL • PASS GENERATED
              </p>
            </div>

            {/* DIGITAL CYBER PASS CARD */}
            <div 
              id="cyber-pass-card"
              className="relative p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-cyber-900 via-cyber-950 to-cyber-900 border-2 border-cyber-cyan/50 shadow-[0_0_40px_rgba(0,240,255,0.2)] overflow-hidden"
            >
              {/* Hologram top edge strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyber-cyan via-cyber-violet to-cyber-cyan animate-pulse" />

              {/* Pass Content */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                
                {/* Left: Credential Details */}
                <div className="flex-1 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-orbitron font-extrabold text-sm text-white tracking-wider">
                      SYSTECH 2K27 PASS
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      CLEARANCE ID
                    </span>
                    <span className="font-mono font-bold text-lg text-cyber-cyan tracking-widest text-glow-cyan">
                      {confirmedRecord.registrationId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">OPERATIVE</span>
                      <span className="font-semibold text-white">{confirmedRecord.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">EVENT</span>
                      <span className="font-semibold text-cyber-violet">{currentEvent.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">INSTITUTION</span>
                      <span className="font-semibold text-slate-300 truncate block">{confirmedRecord.collegeName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">FORMAT</span>
                      <span className="font-semibold text-slate-300">
                        {confirmedRecord.participationType} {confirmedRecord.teamName ? `(${confirmedRecord.teamName})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">TEAM SIZE</span>
                      <span className="font-semibold text-cyber-cyan">
                        {confirmedRecord.participationType === 'Individual'
                          ? '1 Member'
                          : `${1 + (confirmedRecord.teamMembers?.filter(m => m.trim().length > 0).length || 0)} Member${
                              1 + (confirmedRecord.teamMembers?.filter(m => m.trim().length > 0).length || 0) > 1 ? 's' : ''
                            }`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                    <span>DATE: {currentEvent.date}</span>
                    <span>VENUE: {currentEvent.venue.split('(')[0]}</span>
                  </div>
                </div>


              </div>

              {/* Watermark */}
              <div className="absolute -bottom-6 -right-6 font-orbitron font-black text-7xl text-white/[0.02] pointer-events-none select-none">
                2K27
              </div>
            </div>

            {/* Actions for Participant */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handlePrintPass}
                className="w-full sm:flex-1 py-3 rounded-xl bg-cyber-cyan text-black font-mono font-bold text-xs tracking-wider hover:shadow-neon-cyan flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4 text-black" />
                <span>SAVE / PRINT PASS (PDF)</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setStep('form');
                  setConfirmedRecord(null);
                  setFormData({
                    fullName: '',
                    email: '',
                    phone: '',
                    collegeName: '',
                    department: '',
                    yearOfStudy: '3rd Year',
                    eventId: eventsList[0]?.id || EVENTS_DATA[0].id,
                    participationType: 'Individual',
                    teamName: '',
                    teamMembers: [''],
                  });
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 border border-white/15 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ENROLL ANOTHER</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
