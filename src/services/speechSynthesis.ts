/**
 * DCE Transit AI — Voice Assistance System
 * Prebuilt Voice: "Leda" (Gemini Multimodal Audio)
 * Voice Assistance Speed: 0.95x
 *
 * User Configuration:
 * const config = {
 *   responseModalities: ["AUDIO"],
 *   speechConfig: {
 *     voiceConfig: {
 *       prebuiltVoiceConfig: {
 *         voiceName: "Leda"
 *       }
 *     }
 *   }
 * };
 */

import { API_KEY } from './api';

export const GEMINI_LEDA_CONFIG = {
  responseModalities: ['AUDIO'],
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Leda',
      },
    },
  },
};

const STORAGE_KEY = 'bus_tracker_leda_voice_enabled';

class LedaVoiceSynthesizer {
  private enabled: boolean = true;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  public speed: number = 0.95; // The voice assistance speed is 0.95

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      this.enabled = saved !== null ? saved === 'true' : true;

      // Populate Web Speech voices for zero-latency client fallback
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
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Prioritize graceful female voices that embody the "Leda" persona
    const candidates = [
      voices.find((v) => /leda/i.test(v.name)),
      voices.find((v) => v.lang.startsWith('en-GB') && /sonia|libby|hazel|grace|serena|victoria/i.test(v.name)),
      voices.find((v) => v.lang.startsWith('en-GB') && /female/i.test(v.name)),
      voices.find((v) => /Google UK English Female/i.test(v.name)),
      voices.find((v) => v.lang === 'en-GB'),
      voices.find((v) => /samantha|karen|moira|victoria/i.test(v.name)),
      voices.find((v) => v.lang.startsWith('en') && /jenny|aria|zira/i.test(v.name)),
      voices.find((v) => v.lang.startsWith('en')),
    ];

    this.preferredVoice = candidates.find(Boolean) || voices[0] || null;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem(STORAGE_KEY, String(enabled));
    if (!enabled) {
      this.stop();
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
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

  /**
   * Cleans text for natural speech pronunciation (strips markdown, URLs, emojis)
   */
  private sanitizeForSpeech(raw: string): string {
    return raw
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/`([^`]+)`/g, '$1') // Code
      .replace(/#+\s/g, '') // Headings
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/https?:\/\/\S+/g, '') // Bare URLs
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Emojis
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speak using Gemini "Leda" Audio or Web Speech fallback at 0.95 speed
   */
  public async speak(
    text: string,
    options?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
  ): Promise<void> {
    if (!this.enabled) return;

    this.stop();
    const cleanText = this.sanitizeForSpeech(text);
    if (!cleanText) return;

    // 1. Try Gemini 2.0 Audio with prebuiltVoiceConfig: "Leda"
    if (API_KEY && !API_KEY.includes('YOUR_')) {
      try {
        const played = await this.speakWithGeminiAudio(cleanText, options);
        if (played) return;
      } catch (err) {
        console.warn('[Voice Assistant] Gemini Leda audio generation fallback to Web Speech:', err);
      }
    }

    // 2. High-Fidelity Web Speech API (Leda persona @ 0.95 speed)
    this.speakWithWebSpeech(cleanText, options);
  }

  /**
   * Query Gemini 2.0 Flash Audio API with prebuiltVoiceConfig: { voiceName: "Leda" }
   */
  private async speakWithGeminiAudio(
    text: string,
    options?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
  ): Promise<boolean> {
    try {
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
          generationConfig: GEMINI_LEDA_CONFIG,
        }),
      });

      if (!response.ok) return false;
      const data = await response.json();
      const part = data.candidates?.[0]?.content?.parts?.[0];
      const inlineData = part?.inlineData;

      if (!inlineData?.data) return false;

      // Base64 to ArrayBuffer
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
      audio.playbackRate = this.speed; // Voice assistance speed is 0.95

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

  /**
   * Helper to format raw PCM into standard playable WAV
   */
  private pcmToWavBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);

    // RIFF header
    this.writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    this.writeAscii(view, 8, 'WAVE');
    // fmt chunk
    this.writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    // data chunk
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

  /**
   * Web Speech API (Leda persona with speed = 0.95)
   */
  private speakWithWebSpeech(
    text: string,
    options?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (!this.preferredVoice) {
      this.initVoiceList();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }

    // Persona tuning: Leda @ 0.95 speed
    utterance.lang = this.preferredVoice?.lang || 'en-GB';
    utterance.rate = this.speed; // Exact voice assistance speed: 0.95
    utterance.pitch = 1.05; // Calm, poised, clear
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

  /**
   * Spoken milestone announcement for arriving DCE buses
   */
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

  /**
   * Test voice with Leda persona at 0.95 speed
   */
  public testVoice() {
    this.speak(
      "Good day. I am Leda, the official voice assistant for Dhanalakshmi College of Engineering, speaking at zero point nine five speed. Real-time bus tracking is active."
    );
  }
}

export const gracefulVoice = new LedaVoiceSynthesizer();
export const ledaVoice = gracefulVoice;
