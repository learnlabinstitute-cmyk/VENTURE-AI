/**
 * Audio synthesis for phone sound effects, speech recognition, and speech playback
 */

// Web Audio sound effects synthesizer for phone call realism
class SoundEffectsManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Ringing tone when initiating a phone call
  playRingTone(): () => void {
    try {
      const ctx = this.getContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      // US ringback tone is 440Hz + 480Hz
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      let isPlaying = true;
      const interval = setInterval(() => {
        if (!isPlaying) return;
        const now = ctx.currentTime;
        // 2s on, 4s off cycle
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.setValueAtTime(0, now + 1.6);
      }, 3000);

      return () => {
        isPlaying = false;
        clearInterval(interval);
        try {
          gain.gain.setValueAtTime(0, ctx.currentTime);
          osc1.stop();
          osc2.stop();
        } catch (_) {}
      };
    } catch (_) {
      return () => {};
    }
  }

  // Modern call connected chime
  playConnectChime(): void {
    try {
      const ctx = this.getContext();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);

        gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.08);
        osc.stop(ctx.currentTime + index * 0.08 + 0.45);
      });
    } catch (_) {}
  }

  // Call ended hangup sound
  playDisconnectTone(): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(425, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  }

  // Mic speaking active pip
  playMicBeep(): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (_) {}
  }
}

export const soundEffects = new SoundEffectsManager();

// Speech Synthesis Manager for Venture Support Voice
export class VoiceSpeaker {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private onEndCallbacks: (() => void)[] = [];

  speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      voiceName?: string;
      onStart?: () => void;
      onEnd?: () => void;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        options.onEnd?.();
        resolve();
        return;
      }

      this.stop();

      // Clean speech text (strip markdown, asterisks, urls)
      const cleanText = text
        .replace(/[*#_~`[\]()]/g, "")
        .replace(/https?:\/\/\S+/g, "link")
        .trim();

      if (!cleanText) {
        options.onEnd?.();
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;
      this.isSpeaking = true;

      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;

      // Select high quality voice if available (prioritizing Indian English/Hindi or natural female voices for Isha)
      const voices = window.speechSynthesis.getVoices();
      if (options.voiceName) {
        const found = voices.find((v) => v.name === options.voiceName);
        if (found) utterance.voice = found;
      } else {
        // Preferred natural voices for executive Isha
        const preferred =
          voices.find(
            (v) =>
              (v.lang === "en-IN" || v.lang === "hi-IN") &&
              (v.name.toLowerCase().includes("female") ||
                v.name.toLowerCase().includes("google") ||
                v.name.toLowerCase().includes("natural") ||
                v.name.toLowerCase().includes("heera") ||
                v.name.toLowerCase().includes("lekha") ||
                v.name.toLowerCase().includes("priya"))
          ) ||
          voices.find((v) => v.lang === "en-IN" || v.lang === "hi-IN") ||
          voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Natural") ||
                v.name.includes("Samantha") ||
                v.name.includes("Victoria") ||
                v.name.includes("Google") ||
                v.name.includes("Serena"))
          );
        if (preferred) utterance.voice = preferred;
      }

      utterance.onstart = () => {
        options.onStart?.();
      };

      const finish = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        options.onEnd?.();
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  getSpeakingStatus(): boolean {
    return this.isSpeaking || ("speechSynthesis" in window && window.speechSynthesis.speaking);
  }

  static getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!("speechSynthesis" in window)) return [];
    return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  }
}

export const voiceSpeaker = new VoiceSpeaker();

// Web Speech Recognition Controller
export interface SpeechRecognitionHandlers {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class VoiceListener {
  private recognition: any = null;
  private isListening = false;
  private shouldRestart = false;

  constructor() {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
    }
  }

  isSupported(): boolean {
    return Boolean(this.recognition);
  }

  start(handlers: SpeechRecognitionHandlers): boolean {
    if (!this.recognition) return false;
    this.shouldRestart = true;

    this.recognition.onstart = () => {
      this.isListening = true;
      handlers.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final.trim()) {
        handlers.onResult(final.trim(), true);
      } else if (interim.trim()) {
        handlers.onResult(interim.trim(), false);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        handlers.onError?.(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      handlers.onEnd?.();
      // Auto-restart continuous listening if still intended to be listening
      if (this.shouldRestart) {
        try {
          this.recognition.start();
        } catch (_) {}
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      return false;
    }
  }

  stop(): void {
    this.shouldRestart = false;
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
  }

  abort(): void {
    this.shouldRestart = false;
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (_) {}
    }
  }
}
