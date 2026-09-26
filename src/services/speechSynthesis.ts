/**
 * DCE Transit AI — Multi-Voice Multimodal Audio & Speech System
 * Features 5 Prebuilt Voice Assistants & 5 Configurable Playback Speeds
 *
 * Speeds: 0.9x, 0.95x, 1.0x, 1.5x, 2.0x
 * Voice Personas:
 * 1. Leda (Soothing & Warm • Female)
 * 2. Puck (Upbeat & Energetic • Male)
 * 3. Charon (Deep & Command • Male)
 * 4. Aoede (Melodious & Clear • Female)
 * 5. Fenrir (Crisp & Tactical • Modern)
 */

import { API_KEY } from './api';
import type { VoiceAssistantId, VoiceAssistantProfile, VoiceSpeed } from '../types/bus';

export const VOICE_SPEEDS: VoiceSpeed[] = [0.9, 0.95, 1, 1.5, 2];

export const VOICE_PROFILES: Record<VoiceAssistantId, VoiceAssistantProfile> = {
  leda: {
    id: 'leda',
    name: 'Leda',
    tag: 'Soothing & Warm',
    gender: 'Female',
    description: 'Calm, friendly, and poised female transit guide',
    geminiVoice: 'Leda',
    pitch: 1.05,
    sampleText: 'Hello! I am Leda, your soothing transit guide for Dhanalakshmi College of Engineering. Bus tracking is active.',
  },
  puck: {
    id: 'puck',
    name: 'Puck',
    tag: 'Upbeat & Energetic',
    gender: 'Male',
    description: 'Vibrant, high-energy, and friendly morning campus copilot',
    geminiVoice: 'Puck',
    pitch: 1.18,
    sampleText: 'Hey there! I am Puck, your energetic DCE copilot. All bus routes are live and running on time!',
  },
  charon: {
    id: 'charon',
    name: 'Charon',
    tag: 'Deep & Command',
    gender: 'Male',
    description: 'Deep, authoritative, and professional transit dispatcher',
    geminiVoice: 'Charon',
    pitch: 0.80,
    sampleText: 'Attention passengers. This is Charon. Dhanalakshmi College express fleet telemetry is verified and live.',
  },
  aoede: {
    id: 'aoede',
    name: 'Aoede',
    tag: 'Melodious & Clear',
    gender: 'Female',
    description: 'Articulate, musical, and crystal-clear acoustic voice',
    geminiVoice: 'Aoede',
    pitch: 1.22,
    sampleText: 'Welcome aboard. I am Aoede, bringing you melodious and precise DCE bus arrival updates.',
  },
  fenrir: {
    id: 'fenrir',
    name: 'Fenrir',
    tag: 'Crisp & Tactical',
    gender: 'Neutral',
    description: 'Fast, modern, and direct high-efficiency navigation AI',
    geminiVoice: 'Fenrir',
    pitch: 0.95,
    sampleText: 'Navigation locked. I am Fenrir. Real-time GPS coordinates, speed, and ETA calculations are active.',
  },
  demodokos: {
    id: 'demodokos',
    name: 'Demodokos (v4)',
    tag: 'Trained Audio AI',
    gender: 'Neutral',
    description: 'Local cmp-nct Demodokos Foundry v4 8B audio model',
    geminiVoice: 'Puck',
    pitch: 1.0,
    sampleText: 'Demodokos Foundry audio pipeline active. Local 8B audio model ready for DCE transit updates.',
  },
};

const STORAGE_KEY_ENABLED = 'bus_tracker_voice_enabled';
const STORAGE_KEY_VOICE = 'bus_tracker_voice_assistant_id';
const STORAGE_KEY_SPEED = 'bus_tracker_voice_speed';

class TransitVoiceSynthesizer {
  private enabled: boolean = true;
  private currentVoiceId: VoiceAssistantId = 'leda';
  public speed: VoiceSpeed = 0.95;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const savedEnabled = localStorage.getItem(STORAGE_KEY_ENABLED);
      this.enabled = savedEnabled !== null ? savedEnabled === 'true' : true;

      const savedVoice = localStorage.getItem(STORAGE_KEY_VOICE) as VoiceAssistantId;
      if (savedVoice && VOICE_PROFILES[savedVoice]) {
        this.currentVoiceId = savedVoice;
      }

      const savedSpeed = parseFloat(localStorage.getItem(STORAGE_KEY_SPEED) || '');
      if (VOICE_SPEEDS.includes(savedSpeed as VoiceSpeed)) {
        this.speed = savedSpeed as VoiceSpeed;
      }

      if ('speechSynthesis' in window) {
        this.initVoiceList();
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoiceList();
        };
      }
    }
  }

  private initVoiceList() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices() || [];
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
    }
    if (!enabled) {
      this.stop();
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public getVoice(): VoiceAssistantId {
    return this.currentVoiceId;
  }

  public setVoice(voiceId: VoiceAssistantId) {
    if (VOICE_PROFILES[voiceId]) {
      this.currentVoiceId = voiceId;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_VOICE, voiceId);
      }
    }
  }

  public getSpeed(): VoiceSpeed {
    return this.speed;
  }

  public setSpeed(speed: VoiceSpeed) {
    if (VOICE_SPEEDS.includes(speed)) {
      this.speed = speed;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SPEED, String(speed));
      }
    }
  }

  public stop() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      }
    }
    this.currentUtterance = null;
  }

  public isSpeaking(): boolean {
    if (typeof window === 'undefined') return false;
    const synthSpeaking = 'speechSynthesis' in window && window.speechSynthesis.speaking;
    const audioPlaying = this.currentAudio !== null && !this.currentAudio.paused;
    return Boolean(this.currentUtterance || synthSpeaking || audioPlaying);
  }

  private sanitizeForSpeech(raw: string): string {
    return raw
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Find matching system voice based on persona characteristics
   */
  private pickSystemVoice(voiceId: VoiceAssistantId): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      this.initVoiceList();
    }
    const profile = VOICE_PROFILES[voiceId] || VOICE_PROFILES.leda;
    const isMale = profile.gender === 'Male';
    const isFemale = profile.gender === 'Female';

    if (voiceId === 'charon') {
      // Deep male voice
      const match = this.voices.find(
        (v) => /rishi|guy|arthur|james|mark|david|male|deep/i.test(v.name) && v.lang.startsWith('en')
      );
      if (match) return match;
    } else if (voiceId === 'puck') {
      // Upbeat energetic male
      const match = this.voices.find(
        (v) => /daniel|oliver|george|steffan|male/i.test(v.name) && v.lang.startsWith('en')
      );
      if (match) return match;
    } else if (voiceId === 'aoede') {
      // Articulate expressive female
      const match = this.voices.find(
        (v) => /victoria|karen|moira|tessa|fiona|female/i.test(v.name) && v.lang.startsWith('en')
      );
      if (match) return match;
    } else if (voiceId === 'leda') {
      // Warm soothing female
      const match = this.voices.find(
        (v) => /sonia|libby|hazel|grace|serena|samantha|zira|aria/i.test(v.name) && v.lang.startsWith('en')
      );
      if (match) return match;
    } else if (voiceId === 'fenrir') {
      // Neutral crisp
      const match = this.voices.find(
        (v) => /alex|fred|google us english|en-us/i.test(v.name)
      );
      if (match) return match;
    } else if (voiceId === 'demodokos') {
      // Modern natural system voice fallback
      const match = this.voices.find(
        (v) => /natural|neural|online|google|enhanced/i.test(v.name) && v.lang.startsWith('en')
      );
      if (match) return match;
    }

    // Generic gender matching fallback
    if (isFemale) {
      const female = this.voices.find(
        (v) => v.lang.startsWith('en') && /female|woman|girl|samantha|zira/i.test(v.name)
      );
      if (female) return female;
    } else if (isMale) {
      const male = this.voices.find(
        (v) => v.lang.startsWith('en') && /male|man|david|daniel/i.test(v.name)
      );
      if (male) return male;
    }

    return this.voices.find((v) => v.lang.startsWith('en')) || this.voices[0] || null;
  }

  /**
   * Speak using Gemini 2.0 Multimodal Audio, Demodokos Foundry local server, or high-fidelity Web Speech fallback
   */
  public async speak(
    text: string,
    options?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
    overrideVoiceId?: VoiceAssistantId,
    overrideSpeed?: VoiceSpeed
  ): Promise<void> {
    if (!this.enabled) return;

    this.stop();
    const cleanText = this.sanitizeForSpeech(text);
    if (!cleanText) return;

    const voiceId = overrideVoiceId || this.currentVoiceId;
    const speed = overrideSpeed || this.speed;

    // 0. Try local or hosted cmp-nct Demodokos Foundry v4 server if selected
    if (voiceId === 'demodokos') {
      try {
        const played = await this.speakWithDemodokos(cleanText, speed, options);
        if (played) return;
      } catch (err) {
        console.warn('[Voice Assistant] Demodokos server unavailable, falling back to Gemini/Web Speech:', err);
      }
    }

    // 1. Try Gemini Multimodal Audio API if key is present
    if (API_KEY && !API_KEY.includes('YOUR_')) {
      try {
        const played = await this.speakWithGeminiAudio(cleanText, voiceId, speed, options);
        if (played) return;
      } catch (err) {
        console.warn('[Voice Assistant] Gemini audio generation fallback to Web Speech:', err);
      }
    }

    // 2. High-Fidelity Web Speech API
    this.speakWithWebSpeech(cleanText, voiceId, speed, options);
  }

  /**
   * Speak using local/remote cmp-nct Demodokos Foundry v4 Audio Server
   */
  private async speakWithDemodokos(
    text: string,
    speed: VoiceSpeed,
    options?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
  ): Promise<boolean> {
    try {
      const serverUrl =
        (typeof window !== 'undefined' && localStorage.getItem('demodokos_server_url')) ||
        (import.meta as any).env?.VITE_DEMODOKOS_URL ||
        'http://localhost:8000/api/tts';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speed,
          voice_model: 'cmp-nct/demodokos-foundry-music-v4',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) return false;

      const blob = await response.blob();
      if (!blob || blob.size === 0) return false;

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      audio.playbackRate = speed;

      return new Promise<boolean>((resolve) => {
        audio.onplay = () => {
          options?.onStart?.();
        };
        audio.onended = () => {
          options?.onEnd?.();
          this.currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          resolve(true);
        };
        audio.onerror = () => {
          options?.onError?.();
          this.currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          resolve(false);
        };
        audio.play().catch(() => resolve(false));
      });
    } catch {
      return false;
    }
  }

  /**
   * Gemini Audio Generation using the selected prebuilt voice
   */
  private async speakWithGeminiAudio(
    text: string,
    voiceId: VoiceAssistantId,
    speed: VoiceSpeed,
    options?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
  ): Promise<boolean> {
    try {
      const profile = VOICE_PROFILES[voiceId] || VOICE_PROFILES.leda;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `Please speak the following message clearly: ${text}` }],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: profile.geminiVoice,
                },
              },
            },
          },
        }),
      });

      if (!response.ok) return false;
      const data = await response.json();
      const part = data.candidates?.[0]?.content?.parts?.[0];
      const inlineData = part?.inlineData;

      if (!inlineData?.data) return false;

      const binaryString = atob(inlineData.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      let audioBlob: Blob;
      if (inlineData.mimeType?.includes('pcm')) {
        audioBlob = this.pcmToWavBlob(bytes, 24000);
      } else {
        audioBlob = new Blob([bytes], { type: inlineData.mimeType || 'audio/wav' });
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      audio.playbackRate = speed;

      audio.onplay = () => options?.onStart?.();
      audio.onended = () => {
        this.currentAudio = null;
        options?.onEnd?.();
      };
      audio.onerror = () => {
        this.currentAudio = null;
        options?.onError?.();
      };

      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  private pcmToWavBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);

    this.writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    this.writeAscii(view, 8, 'WAVE');
    this.writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    this.writeAscii(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);

    new Uint8Array(buffer, 44).set(pcmData);
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeAscii(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  private speakWithWebSpeech(
    text: string,
    voiceId: VoiceAssistantId,
    speed: VoiceSpeed,
    options?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const profile = VOICE_PROFILES[voiceId] || VOICE_PROFILES.leda;
    const chosenVoice = this.pickSystemVoice(voiceId);

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = speed;
    utterance.pitch = profile.pitch;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      options?.onError?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  public announceBusMilestone(
    milestone: '1km' | '500m' | '200m' | 'arrived',
    busNumber: string,
    stopName: string,
    etaMinutes: number = 2
  ) {
    if (!this.enabled) return;

    let message = '';
    switch (milestone) {
      case '1km':
        message = `Attention please. Dhanalakshmi College bus ${busNumber} is one kilometre away from ${stopName}. Estimated arrival in approximately ${etaMinutes} minutes.`;
        break;
      case '500m':
        message = `Bus ${busNumber} is approaching ${stopName}. Distance is 500 metres. Please prepare for boarding.`;
        break;
      case '200m':
        message = `Bus ${busNumber} is arriving at ${stopName}. Please proceed to the boarding area.`;
        break;
      case 'arrived':
        message = `Bus ${busNumber} has arrived at ${stopName}. Have a safe journey!`;
        break;
    }

    this.speak(message);
  }

  public announceStopMilestone(
    busNumber: string,
    stopName: string,
    distanceKm: number,
    isStudentStop: boolean,
    etaMinutes: number = 2,
    isArrived: boolean = false
  ) {
    if (!this.enabled) return;

    let message = '';
    if (isArrived) {
      if (isStudentStop) {
        message = `Attention! Bus ${busNumber} has arrived at your location, ${stopName}. Please proceed to board the bus now.`;
      } else {
        message = `Bus ${busNumber} has reached ${stopName} Stop.`;
      }
    } else {
      if (isStudentStop) {
        message = `Attention! Bus ${busNumber} is near to you! Only ${distanceKm.toFixed(1)} kilometres to reach your location at ${stopName}. Estimated arrival in ${etaMinutes} minutes.`;
      } else {
        message = `Bus ${busNumber} is approaching ${stopName} Stop, ${distanceKm.toFixed(1)} kilometres away.`;
      }
    }

    this.speak(message);
  }

  public testVoice(voiceId?: VoiceAssistantId, speed?: VoiceSpeed) {
    const id = voiceId || this.currentVoiceId;
    const profile = VOICE_PROFILES[id] || VOICE_PROFILES.leda;
    const activeSpeed = speed || this.speed;

    const text = `${profile.sampleText} Speaking at ${activeSpeed}x speed.`;
    this.speak(text, undefined, id, activeSpeed);
  }
}

export const gracefulVoice = new TransitVoiceSynthesizer();
export const ledaVoice = gracefulVoice;
