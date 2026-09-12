import React, { useState, useEffect, useRef } from "react";
import { VentureLogo } from "./VentureLogo";
import { AudioVisualizer } from "./AudioVisualizer";
import { CallerInfo, Message, VoiceSettings } from "../types";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Send,
  MessageSquare,
  Settings,
  Sparkles,
  RotateCcw,
  User,
  Phone,
  Mail,
  Square,
  HelpCircle,
} from "lucide-react";
import { VoiceListener, voiceSpeaker, soundEffects } from "../utils/audio";

interface ActiveCallInterfaceProps {
  caller: CallerInfo;
  onEndCall: (messages: Message[], durationSec: number) => void;
  voiceSettings: VoiceSettings;
  onUpdateSettings: (settings: VoiceSettings) => void;
}

export const ActiveCallInterface: React.FC<ActiveCallInterfaceProps> = ({
  caller,
  onEndCall,
  voiceSettings,
  onUpdateSettings,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [showTranscript, setShowTranscript] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [duration, setDuration] = useState(0);
  const [activeSpeechTimeout, setActiveSpeechTimeout] = useState<any>(null);

  const listenerRef = useRef<VoiceListener | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const durationTimerRef = useRef<any>(null);
  const isComponentMounted = useRef(true);

  // Call duration counter
  useEffect(() => {
    durationTimerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(durationTimerRef.current);
    };
  }, []);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Scroll transcript to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, interimText]);

  // Initial greeting announcement when call connects
  useEffect(() => {
    isComponentMounted.current = true;
    const initialGreeting = "Hello, welcome to Venture Infotech Support! Main Isha baat kar rahi hoon. Aaj aapki kya madad kar sakti hoon, kindly batayein?";

    const welcomeMsg: Message = {
      id: "welcome-1",
      role: "assistant",
      text: initialGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isVoice: true,
    };

    setMessages([welcomeMsg]);

    // Speak initial greeting aloud
    if (!isSpeakerMuted) {
      setIsSpeaking(true);
      voiceSpeaker
        .speak(initialGreeting, {
          rate: voiceSettings.rate,
          pitch: voiceSettings.pitch,
          voiceName: voiceSettings.voiceName,
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            if (isComponentMounted.current) {
              setIsSpeaking(false);
              startMicListening();
            }
          },
        })
        .catch(() => {
          setIsSpeaking(false);
          startMicListening();
        });
    } else {
      startMicListening();
    }

    return () => {
      isComponentMounted.current = false;
      voiceSpeaker.stop();
      if (listenerRef.current) {
        listenerRef.current.stop();
      }
    };
  }, []);

  // Initialize and start Speech Recognition
  const startMicListening = () => {
    if (isMicMuted) return;

    if (!listenerRef.current) {
      listenerRef.current = new VoiceListener();
    }

    if (!listenerRef.current.isSupported()) {
      console.warn("Web Speech Recognition is not supported in this browser.");
      return;
    }

    listenerRef.current.stop();

    listenerRef.current.start({
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript, isFinal) => {
        // If assistant is speaking when user speaks, interrupt assistant immediately!
        if (voiceSpeaker.getSpeakingStatus()) {
          voiceSpeaker.stop();
          setIsSpeaking(false);
        }

        setInterimText(transcript);

        // Debounce silence detection or process on isFinal
        if (isFinal && transcript.trim().length > 1) {
          if (activeSpeechTimeout) clearTimeout(activeSpeechTimeout);
          const t = setTimeout(() => {
            handleUserSpoken(transcript);
          }, 800);
          setActiveSpeechTimeout(t);
        }
      },
      onError: (err) => {
        console.warn("Speech listener error:", err);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  };

  const stopMicListening = () => {
    if (listenerRef.current) {
      listenerRef.current.stop();
    }
    setIsListening(false);
  };

  // When caller finishes speaking
  const handleUserSpoken = async (spokenText: string) => {
    const textToSend = spokenText.trim();
    if (!textToSend || isProcessing) return;

    setInterimText("");
    if (activeSpeechTimeout) clearTimeout(activeSpeechTimeout);

    // Stop mic temporarily during AI reasoning & speaking to avoid audio feedback
    stopMicListening();

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isVoice: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Build context history
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          caller: {
            email: caller.email,
            phone: caller.phone,
            reason: caller.reason,
          },
          model: voiceSettings.model,
        }),
      });

      const data = await res.json();
      const replyText =
        data.text ||
        data.fallbackText ||
        "I understand. Venture Support is here to assist you 24/7.";

      const assistantMsg: Message = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isVoice: true,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsProcessing(false);

      // Speak response aloud
      if (!isSpeakerMuted) {
        setIsSpeaking(true);
        await voiceSpeaker.speak(replyText, {
          rate: voiceSettings.rate,
          pitch: voiceSettings.pitch,
          voiceName: voiceSettings.voiceName,
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            if (isComponentMounted.current) {
              setIsSpeaking(false);
              // Resume listening for caller's next turn
              if (!isMicMuted) {
                startMicListening();
              }
            }
          },
        });
      } else {
        if (!isMicMuted) {
          startMicListening();
        }
      }
    } catch (err) {
      console.error("Failed to generate companion response:", err);
      setIsProcessing(false);
      const fallbackMsg: Message = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        text: "Thank you for reaching Venture Support. I've noted that down. Could you clarify your inquiry?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isVoice: true,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (!isMicMuted) {
        startMicListening();
      }
    }
  };

  // Handle manual typed message
  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const txt = manualInput.trim();
    setManualInput("");
    handleUserSpoken(txt);
  };

  // Toggle Mute Mic
  const toggleMuteMic = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      soundEffects.playMicBeep();
      startMicListening();
    } else {
      setIsMicMuted(true);
      stopMicListening();
    }
  };

  // Toggle Speaker
  const toggleMuteSpeaker = () => {
    if (isSpeakerMuted) {
      setIsSpeakerMuted(false);
    } else {
      setIsSpeakerMuted(true);
      voiceSpeaker.stop();
      setIsSpeaking(false);
    }
  };

  // Interrupt AI speaking
  const handleInterrupt = () => {
    voiceSpeaker.stop();
    setIsSpeaking(false);
    if (!isMicMuted) {
      startMicListening();
    }
  };

  // Replay assistant message
  const replayMessage = (text: string) => {
    if (isSpeakerMuted) return;
    voiceSpeaker.stop();
    setIsSpeaking(true);
    voiceSpeaker.speak(text, {
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      voiceName: voiceSettings.voiceName,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        if (!isMicMuted) startMicListening();
      },
    });
  };

  // End the call
  const handleEndCall = () => {
    voiceSpeaker.stop();
    stopMicListening();
    soundEffects.playDisconnectTone();
    onEndCall(messages, duration);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-4rem)] max-h-[860px]">
      {/* Top Header Card */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl mb-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Call Title */}
        <div className="flex items-center gap-3">
          <VentureLogo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-base sm:text-lg">
                Venture Support 24/7 Call
              </h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Voice Companion powered by Gemini 3.1 • HD Audio
            </p>
          </div>
        </div>

        {/* Caller Info & Duration */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Verified Caller Pill */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            {caller.name && (
              <>
                <div className="flex items-center gap-1.5 text-slate-200">
                  <User className="w-3.5 h-3.5 text-lime-400" />
                  <span className="font-semibold">{caller.name}</span>
                </div>
                <span className="text-slate-700">|</span>
              </>
            )}
            <div className="flex items-center gap-1.5 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-lime-400" />
              <span className="font-medium truncate max-w-[140px]">{caller.email}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-lime-400" />
              <span className="font-medium">{caller.phone}</span>
            </div>
          </div>

          {/* Call Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-lime-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
            {formatDuration(duration)}
          </div>

          {/* Toggle Transcript / Settings */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowTranscript((prev) => !prev)}
              className={`p-2 rounded-lg border transition-colors ${
                showTranscript
                  ? "bg-lime-500/10 border-lime-500/30 text-lime-400"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white"
              }`}
              title="Toggle Live Transcript"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className={`p-2 rounded-lg border transition-colors ${
                showSettings
                  ? "bg-lime-500/10 border-lime-500/30 text-lime-400"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white"
              }`}
              title="Voice Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Area (Voice Hub + Transcript) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left / Center: Interactive Voice Orb Hub */}
        <div
          className={`flex flex-col justify-between bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 ${
            showTranscript ? "lg:col-span-7" : "lg:col-span-12"
          }`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
              isSpeaking
                ? "bg-[radial-gradient(circle_at_center,rgba(132,204,22,0.18)_0%,transparent_70%)]"
                : isListening
                ? "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]"
                : isProcessing
                ? "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.15)_0%,transparent_70%)]"
                : "bg-transparent"
            }`}
          />

          {/* Status Chip */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Line Status:
              </span>
              {isSpeaking ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-500/20 border border-lime-500/40 text-lime-400 text-xs font-bold animate-pulse">
                  <Volume2 className="w-3.5 h-3.5" />
                  Venture Support Speaking
                </span>
              ) : isProcessing ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 text-xs font-bold animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemini 3.1 Thinking...
                </span>
              ) : isListening && !isMicMuted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                  <Mic className="w-3.5 h-3.5 animate-bounce" />
                  Listening to You (Speak naturally)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  Mic Muted
                </span>
              )}
            </div>

            {/* Model Badge */}
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
              {voiceSettings.model}
            </span>
          </div>

          {/* Central Animated Voice Orb */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center py-4">
            {/* Concentric Ripple Rings */}
            <div className="relative flex items-center justify-center">
              {/* Outer wave ring */}
              <div
                className={`absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-lime-400/20 transition-all duration-700 ${
                  isSpeaking || isListening
                    ? "scale-110 opacity-70 animate-ping"
                    : "scale-95 opacity-20"
                }`}
              />
              {/* Middle wave ring */}
              <div
                className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-emerald-400/30 transition-all duration-500 ${
                  isSpeaking
                    ? "scale-105 border-lime-400/50 animate-pulse"
                    : isListening
                    ? "scale-105 border-emerald-400/50 animate-pulse"
                    : "scale-100 opacity-30"
                }`}
              />

              {/* Central Logo Orb */}
              <div
                className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center p-2 bg-gradient-to-br from-slate-900 to-slate-950 border-2 transition-all duration-300 shadow-2xl ${
                  isSpeaking
                    ? "border-lime-400 ring-8 ring-lime-400/20 shadow-lime-500/40"
                    : isListening
                    ? "border-emerald-400 ring-8 ring-emerald-400/20 shadow-emerald-500/30"
                    : isProcessing
                    ? "border-sky-400 ring-8 ring-sky-400/20 shadow-sky-500/30"
                    : "border-slate-700 shadow-black"
                }`}
              >
                <VentureLogo size="lg" />
              </div>
            </div>

            {/* Audio Waveform Canvas */}
            <div className="mt-6 w-full">
              <AudioVisualizer
                isListening={isListening && !isMicMuted}
                isSpeaking={isSpeaking}
                isProcessing={isProcessing}
                volumeLevel={interimText ? 0.7 : 0.2}
              />
            </div>

            {/* Live Spoken Speech Preview (Interim speech recognition) */}
            <div className="min-h-[2.5rem] mt-2 flex items-center justify-center px-4 text-center">
              {interimText ? (
                <p className="text-lime-300 text-sm font-medium italic animate-pulse">
                  "{interimText}"
                </p>
              ) : isSpeaking ? (
                <p className="text-slate-300 text-xs font-medium">
                  Press <span className="text-lime-400 font-bold">Interrupt</span> or start speaking anytime to pause assistant
                </p>
              ) : isListening && !isMicMuted ? (
                <p className="text-slate-400 text-xs">
                  Speak into your microphone — Gemini 3.1 is actively listening
                </p>
              ) : (
                <p className="text-slate-500 text-xs">Microphone is paused. Click unmute to speak.</p>
              )}
            </div>
          </div>

          {/* Quick Caller Inquiries Prompt Chips */}
          <div className="relative z-10 pt-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-lime-400" />
              Script Objections & Test Queries (Click to speak):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Sales executive ne daily thousands sales bola tha, jhoot bola kya?",
                "Mera ad chal raha hai par sales nahi aa rahi, ad abhi OFF kar do!",
                "Mera phone disconnect hone par number offline kyu batata hai?",
                "Ad ka daily update aur spend kahan check karu?",
                "2 din ho gaye, winning product backup plan execute karo",
                "Mujhe refund chahiye, digital project cancel karo",
              ].map((chip) => (
                <button
                  key={chip}
                  disabled={isProcessing}
                  onClick={() => handleUserSpoken(chip)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-lime-500/40 text-slate-300 hover:text-white text-xs transition-colors text-left"
                >
                  "{chip}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Live Call Transcript Drawer */}
        {showTranscript && (
          <div className="lg:col-span-5 flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
            {/* Transcript Header */}
            <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-lime-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Live Spoken Transcript
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {messages.length} exchanges
              </span>
            </div>

            {/* Transcript Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                    {m.role === "user" ? (
                      <>
                        <span>{caller.name || "You"}</span>
                        <User className="w-3 h-3 text-slate-400" />
                        <span>• {m.timestamp}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lime-400 font-semibold">Venture Support</span>
                        <span>• {m.timestamp}</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`relative max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-tr-xs shadow-md"
                        : "bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-xs shadow-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>

                    {/* Replay voice button for assistant messages */}
                    {m.role === "assistant" && (
                      <button
                        onClick={() => replayMessage(m.text)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-lime-400 hover:text-lime-300 font-medium transition-colors"
                        title="Replay Voice Audio"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Replay audio</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Live interim typing indicator */}
              {interimText && (
                <div className="flex flex-col items-end">
                  <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 italic">
                    "{interimText}..."
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-sky-400 italic p-2">
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  Gemini 3.1 generating response...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Manual Text Input (Fallback for noisy environments) */}
            <form
              onSubmit={handleSendManual}
              className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Type a message or inquiry..."
                disabled={isProcessing}
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
              />
              <button
                type="submit"
                disabled={isProcessing || !manualInput.trim()}
                className="p-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-950 font-bold transition-colors"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Voice Settings Drawer / Modal */}
      {showSettings && (
        <div className="mt-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-lime-400" />
              Voice & Gemini 3.1 Companion Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Gemini Model */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Gemini Model
              </label>
              <select
                value={voiceSettings.model}
                onChange={(e) =>
                  onUpdateSettings({
                    ...voiceSettings,
                    model: e.target.value as any,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-lime-500"
              >
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast Voice)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
              </select>
            </div>

            {/* Speech Rate */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Speech Speed</span>
                <span className="text-lime-400 font-mono">{voiceSettings.rate}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={voiceSettings.rate}
                onChange={(e) =>
                  onUpdateSettings({
                    ...voiceSettings,
                    rate: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-lime-400 cursor-pointer"
              />
            </div>

            {/* Pitch */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Voice Pitch</span>
                <span className="text-lime-400 font-mono">{voiceSettings.pitch}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={voiceSettings.pitch}
                onChange={(e) =>
                  onUpdateSettings({
                    ...voiceSettings,
                    pitch: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-lime-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Primary In-Call Action Bar (Mute, Interrupt, End Call) */}
      <div className="mt-3 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex items-center justify-between gap-3">
        {/* Left: Speaker Mute */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMuteSpeaker}
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
              isSpeakerMuted
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            }`}
            title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
          >
            {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {isSpeakerMuted ? "Speaker Off" : "Speaker On"}
            </span>
          </button>
        </div>

        {/* Center: Primary Call Controls (Mute Mic & Interrupt) */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mute Microphone Button */}
          <button
            onClick={toggleMuteMic}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm shadow-lg transition-all duration-200 active:scale-95 ${
              isMicMuted
                ? "bg-slate-800 border border-rose-500/50 text-rose-400 hover:bg-slate-750"
                : "bg-gradient-to-r from-emerald-500 to-lime-500 text-slate-950 shadow-emerald-500/20 hover:brightness-105 ring-2 ring-emerald-400/30"
            }`}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span>{isMicMuted ? "Unmute Mic" : "Mute Mic"}</span>
          </button>

          {/* Interrupt Button (When AI is speaking) */}
          {isSpeaking && (
            <button
              onClick={handleInterrupt}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition-colors animate-pulse"
              title="Interrupt and speak now"
            >
              <Square className="w-3.5 h-3.5 fill-amber-300" />
              <span>Interrupt</span>
            </button>
          )}
        </div>

        {/* Right: End Call Button */}
        <div>
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 transition-all duration-200 active:scale-95"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
