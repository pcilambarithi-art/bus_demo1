/**
 * DCE Transit AI — Multi-Voice Multimodal Audio & Speech System
 * Features 3 Streamlined Voice Assistants (Demodokos Default, 1 Female, 1 Male)
 * Optimized for cross-platform voice consistency across Windows Desktop & Android Mobile
 *
 * Speeds: 0.9x, 0.95x, 1.0x, 1.5x, 2.0x
 * Voice Personas:
 * 1. Demodokos (Default • Trained Transit AI • Neutral)
 * 2. Leda (Female Voice • Soothing & Clear)
 * 3. Charon (Male Voice • Command & Deep)
 */

import { API_KEY } from './api';
import type { VoiceAssistantId, VoiceAssistantProfile, VoiceSpeed } from '../types/bus';

export const VOICE_SPEEDS: VoiceSpeed[] = [0.9, 0.95, 1, 1.5, 2];

export const VOICE_PROFILES: Record<VoiceAssistantId, VoiceAssistantProfile> = {
  demodokos: {
    id: 'demodokos',
    name: 'Demodokos (AI)',
    tag: 'Default • Transit AI',
    gender: 'Neutral',
    description: 'Default high-precision AI navigation copilot with cross-platform consistent neural audio',
    geminiVoice: 'Puck',
    pitch: 1.0,
    sampleText: 'Demodokos transit AI active. Real-time GPS tracking and Dhanalakshmi College of Engineering arrival telemetry are verified.',
  },
  leda: {
    id: 'leda',
    name: 'Female Voice (Leda)',
    tag: 'Soothing & Clear',
    gender: 'Female',
    description: 'Calm, articulate female transit announcer with soothing clarity',
    geminiVoice: 'Leda',
    pitch: 1.05,
    sampleText: 'Hello! I am your soothing female transit guide for Dhanalakshmi College of Engineering. Bus tracking is active.',
  },
  charon: {
    id: 'charon',
    name: 'Male Voice (Charon)',
    tag: 'Command & Deep',
    gender: 'Male',
    description: 'Authoritative, deep male transit dispatcher for clear bus guidance',
    geminiVoice: 'Charon',
    pitch: 0.85,
    sampleText: 'Attention passengers. Express fleet telemetry is verified and live for Dhanalakshmi College of Engineering.',
  },
};

const STORAGE_KEY_ENABLED = 'bus_tracker_voice_enabled';
const STORAGE_KEY_VOICE = 'bus_tracker_voice_assistant_id';
const STORAGE_KEY_SPEED = 'bus_tracker_voice_speed';

class TransitVoiceSynthesizer {
  private enabled: boolean = true;
  private currentVoiceId: VoiceAssistantId = 'demodokos';
  private demodokosOffline: boolean = false;
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
      } else {
        // Demodokos is the default voice assistant
        this.currentVoiceId = 'demodokos';
        try {
          localStorage.setItem(STORAGE_KEY_VOICE, 'demodokos');
        } catch (_) {}
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
   * Prioritizes cross-platform Google and Natural voices so they sound as identical as possible across Windows and Android!
   */
  private pickSystemVoice(voiceId: VoiceAssistantId): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      this.initVoiceList();
    }
    const profile = VOICE_PROFILES[voiceId] || VOICE_PROFILES.demodokos;

    if (voiceId === 'demodokos') {
      // 1. Prioritize cross-platform Google US/UK English, natural, or neural voices
      const match = this.voices.find(
        (v) => /google\s+us|google\s+uk|natural|neural|online|enhanced/i.test(v.name) && v.lang.startsWith('en')
      );
      if (match) return match;

      // 2. High-quality English voice fallback
      const enMatch = this.voices.find(
        (v) => /google/i.test(v.name) && v.lang.startsWith('en')
      );
      if (enMatch) return enMatch;
    } else if (voiceId === 'leda') {
      // Female voice: Prioritize cross-platform Google Female / Natural Female
      const match = this.voices.find(
        (v) => (/google.*female|google\s+uk\s+english\s+female|google\s+us\s+english/i.test(v.name) ||
                /female|woman|zira|sonia|libby|samantha|victoria|hazel|aria/i.test(v.name)) &&
               v.lang.startsWith('en')
      );
      if (match) return match;
    } else if (voiceId === 'charon') {
      // Male voice: Prioritize cross-platform Google Male / Natural Male
      const match = this.voices.find(
        (v) => (/google.*male|google\s+uk\s+english\s+male/i.test(v.name) ||
                /male|man|david|guy|daniel|george|mark|richard/i.test(v.name)) &&
               v.lang.startsWith('en')
      );
      if (match) return match;
    }

    // Generic gender matching fallback
    if (profile.gender === 'Female') {
      const female = this.voices.find(
        (v) => v.lang.startsWith('en') && /female|woman|zira|samantha/i.test(v.name)
      );
      if (female) return female;
    } else if (profile.gender === 'Male') {
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
    if (voiceId === 'demodokos' && !this.demodokosOffline) {
      try {
        const played = await this.speakWithDemodokos(cleanText, speed, options);
        if (played) return;
      } catch {
        this.demodokosOffline = true;
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
    if (this.demodokosOffline) return false;

    const customUrl =
      (typeof window !== 'undefined' && localStorage.getItem('demodokos_server_url')) ||
      (import.meta as any).env?.VITE_DEMODOKOS_URL;

    // If no custom server is specified, avoid calling localhost:8000 to prevent red net::ERR_CONNECTION_REFUSED
    if (!customUrl) {
      this.demodokosOffline = true;
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(customUrl, {
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

      if (!response.ok) {
        this.demodokosOffline = true;
        return false;
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        this.demodokosOffline = true;
        return false;
      }

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
          this.demodokosOffline = true;
          resolve(false);
        };
        audio.play().catch(() => {
          this.demodokosOffline = true;
          resolve(false);
        });
      });
    } catch {
      this.demodokosOffline = true;
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
    const profile = VOICE_PROFILES[id] || VOICE_PROFILES.demodokos;
    const activeSpeed = speed || this.speed;

    const text = `${profile.sampleText} Speaking at ${activeSpeed}x speed.`;
    this.speak(text, undefined, id, activeSpeed);
  }
}

export const gracefulVoice = new TransitVoiceSynthesizer();
export const ledaVoice = gracefulVoice;
