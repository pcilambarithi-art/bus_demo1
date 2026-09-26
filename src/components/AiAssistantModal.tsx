import React, { useState, useEffect } from 'react';
import { useBus } from '../context/BusContext';
import { Sparkles, Send, X, Bot, CheckCircle2, Loader2, Volume2, VolumeX } from 'lucide-react';
import { queryTransitAssistant } from '../services/api';
import { formatDistance } from '../utils/geo';
import { gracefulVoice, VOICE_PROFILES } from '../services/speechSynthesis';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose }) => {
  const {
    selectedBus,
    selectedRoute,
    studentStop,
    student,
    telemetry,
    allBuses,
    allRoutes,
    activeAlert,
    voiceAssistantId,
    voiceSpeed,
  } = useBus();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Vanakkam! I am the official Dhanalakshmi College of Engineering (DCE) Real-Time Bus AI.\nAsk me about live bus locations, speeds, routes, stops, or ETAs in English or Tanglish (e.g. "Bus enga irukku?", "How much km to Tambaram?").\n\n📌 Note: This chatbot is exclusively dedicated to DCE campus bus tracking.`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);

  // Stop speaking when modal closes
  useEffect(() => {
    if (!isOpen) {
      gracefulVoice.stop();
      setSpeakingIndex(null);
    }
  }, [isOpen]);

  const handleSpeak = (text: string, index: number) => {
    if (speakingIndex === index) {
      gracefulVoice.stop();
      setSpeakingIndex(null);
      return;
    }

    gracefulVoice.speak(
      text,
      {
        onStart: () => setSpeakingIndex(index),
        onEnd: () => setSpeakingIndex(null),
        onError: () => setSpeakingIndex(null),
      },
      voiceAssistantId,
      voiceSpeed
    );
  };

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const question = textToSend || input;
    if (!question.trim() || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setIsLoading(true);

    try {
      // Live web data extraction for all fleet buses and current route stops
      const allBusesSummary = allBuses
        .map((b) => {
          const r = allRoutes.find((route) => route.id === b.routeId);
          return `• ${b.busNumber} (${r?.name || 'Campus Express'}): Driver ${b.driverName} (${b.driverPhone}), Plate: ${b.plateNumber}, Seats: ${b.currentOccupancy}/${b.capacity}`;
        })
        .join('\n');

      const routeStopsSummary = selectedRoute.stops
        .map((s) => `${s.sequence}. ${s.name} (${s.scheduledTime})`)
        .join(' ➔ ');

      const response = await queryTransitAssistant(question, {
        busId: selectedBus.busNumber,
        routeId: selectedRoute.code,
        routeName: selectedRoute.name,
        currentSpeed: telemetry.speedKmh,
        latitude: telemetry.lat,
        longitude: telemetry.lng,
        distanceToStop: `${(telemetry.distanceToStudentStopMeters / 1000).toFixed(1)} km (${formatDistance(telemetry.distanceToStudentStopMeters)})`,
        distanceToCollegeKm: 6.8,
        etaMinutes: telemetry.etaMinutes,
        nextStopName: telemetry.nextStop.name,
        distanceToNextStop: formatDistance(telemetry.distanceToNextStopMeters),
        studentStopName: studentStop.name,
        studentName: student.name,
        status: telemetry.status === 'LIVE' ? 'Moving' : telemetry.status,
        lastUpdatedTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        freshnessSeconds: 10,
        routeStopsSummary,
        allBusesSummary,
        activeAlertsSummary: activeAlert ? `${activeAlert.title} - ${activeAlert.message}` : 'All buses operating normally on schedule',
      });

      const newIndex = messages.length + 1;
      setMessages((prev) => [...prev, { sender: 'ai', text: response }]);

      if (autoSpeak) {
        gracefulVoice.speak(
          response,
          {
            onStart: () => setSpeakingIndex(newIndex),
            onEnd: () => setSpeakingIndex(null),
            onError: () => setSpeakingIndex(null),
          },
          voiceAssistantId,
          voiceSpeed
        );
      }
    } catch {
      const fallbackText = `Bus ${selectedBus.busNumber} (${selectedRoute.name}) - Speed: ${telemetry.speedKmh} km/h. Moving near ${telemetry.nextStop.shortName}. Distance to your stop (${studentStop.shortName}): ${(telemetry.distanceToStudentStopMeters / 1000).toFixed(1)} km (~${telemetry.etaMinutes} mins to reach).`;
      const newIndex = messages.length + 1;
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: fallbackText,
        },
      ]);
      if (autoSpeak) {
        gracefulVoice.speak(
          fallbackText,
          {
            onStart: () => setSpeakingIndex(newIndex),
            onEnd: () => setSpeakingIndex(null),
            onError: () => setSpeakingIndex(null),
          },
          voiceAssistantId,
          voiceSpeed
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Bus enga irukku?',
    `When will ${selectedBus.busNumber} reach my stop?`,
    'Show all active buses to track',
    'What is the bus speed right now?',
    'Near which stop is the bus moving?',
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-lg rounded-3xl dark:bg-[#0B132B]/95 bg-white/95 dark:border-white/15 border-slate-200 border p-6 shadow-2xl backdrop-blur-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b dark:border-white/10 border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base dark:text-white text-slate-900 leading-tight">
                  DCE Transit AI Copilot
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Bus-Only Transit
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                DCE Campus Bus Tracking & Transit Only • English & Tanglish
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Gemini Audio Voice Toggle */}
            <button
              onClick={() => {
                const next = !autoSpeak;
                setAutoSpeak(next);
                if (!next) {
                  gracefulVoice.stop();
                  setSpeakingIndex(null);
                }
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                autoSpeak
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
              }`}
              title={`Toggle Voice: ${VOICE_PROFILES[voiceAssistantId]?.name || 'Demodokos (AI)'} (${voiceSpeed}x Speed)`}
            >
              {autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Voice:</span>
              <span>{VOICE_PROFILES[voiceAssistantId]?.name || 'Demodokos (AI)'} ({voiceSpeed}x)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full dark:text-slate-400 hover:text-white dark:hover:bg-white/10 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 my-1 pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {m.sender === 'user' ? (
                <div className="p-3.5 rounded-2xl text-xs leading-relaxed max-w-[85%] whitespace-pre-line bg-cyan-500 text-black font-semibold shadow-md rounded-tr-sm">
                  {m.text}
                </div>
              ) : (
                <div className="flex flex-col items-start gap-1 max-w-[85%]">
                  <div className="p-3.5 rounded-2xl text-xs leading-relaxed dark:bg-white/5 bg-slate-100 dark:text-slate-200 text-slate-800 border dark:border-white/10 border-slate-200 rounded-tl-sm font-sans whitespace-pre-line">
                    {m.text}
                  </div>
                  <button
                    onClick={() => handleSpeak(m.text, idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-all ${
                      speakingIndex === idx
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 shadow-sm animate-pulse'
                        : 'text-slate-400 hover:text-cyan-400 hover:bg-white/5'
                    }`}
                  >
                    {speakingIndex === idx ? (
                      <>
                        <VolumeX className="w-3 h-3" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        <span>Listen (Leda • 0.95x)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-9">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Checking DCE live GPS database...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts (Section 19 & 20) */}
        <div className="flex gap-1.5 overflow-x-auto py-2 shrink-0 no-scrollbar">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-semibold dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 hover:bg-cyan-500/15 hover:text-cyan-400 border dark:border-white/10 border-slate-200 transition-all shrink-0 active:scale-95"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="pt-2 border-t dark:border-white/10 border-slate-200 flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Ask in English or Tanglish (e.g. Bus enga irukku?)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-800 placeholder-slate-400 outline-none focus:border-cyan-400 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
