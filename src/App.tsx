import React, { useState } from "react";
import { CallerRegistration } from "./components/CallerRegistration";
import { ActiveCallInterface } from "./components/ActiveCallInterface";
import { CallSummaryModal } from "./components/CallSummaryModal";
import { VentureLogo } from "./components/VentureLogo";
import { CallerInfo, CallStatus, Message, VoiceSettings } from "./types";
import { soundEffects } from "./utils/audio";
import { ShieldCheck, PhoneCall, Headphones } from "lucide-react";

export default function App() {
  const [callStatus, setCallStatus] = useState<CallStatus>("registering");
  const [caller, setCaller] = useState<CallerInfo | null>(null);
  const [completedMessages, setCompletedMessages] = useState<Message[]>([]);
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voiceName: "",
    rate: 1.0,
    pitch: 1.0,
    autoListen: true,
    soundEffects: true,
    model: "gemini-3.1-flash-lite",
  });

  const handleStartCall = async (info: CallerInfo) => {
    setCaller(info);
    setCallStatus("connecting");

    // Attempt microphone permissions check
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (e) {
      console.warn("Microphone access prompt dismissed or unavailable; fallback to text/voice speaker:", e);
    }

    // Play ringing tone
    const stopRinging = soundEffects.playRingTone();

    // 1.8s realistic connection delay
    setTimeout(() => {
      stopRinging();
      soundEffects.playConnectChime();
      setCallStatus("connected");
    }, 1800);
  };

  const handleEndCall = (messages: Message[], duration: number) => {
    setCompletedMessages(messages);
    setCallDurationSec(duration);
    setCallStatus("ended");
  };

  const handleRestart = () => {
    setCallStatus("registering");
    setCompletedMessages([]);
    setCallDurationSec(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-lime-500 selection:text-slate-950">
      {/* Top Global Navigation Bar */}
      <header className="w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VentureLogo size="sm" />
            <div>
              <span className="font-extrabold text-white tracking-tight text-base sm:text-lg flex items-center gap-2">
                Venture Infotech Support
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-lime-500/10 border border-lime-500/30 text-lime-400">
                  IVR Active
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span>Executive: Isha • Gemini 3.1</span>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <Headphones className="w-4 h-4 text-lime-400" />
              <span className="hidden md:inline">24/7 Priority Assistance</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col justify-center items-center">
        {callStatus === "registering" && (
          <CallerRegistration onStartCall={handleStartCall} isConnecting={false} />
        )}

        {callStatus === "connecting" && (
          <div className="w-full max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center flex flex-col items-center animate-in fade-in duration-300">
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-lime-500/10 border border-lime-500/30 animate-ping absolute inset-0" />
              <div className="relative w-28 h-28 rounded-full bg-slate-950 border-2 border-lime-400 flex items-center justify-center p-3 shadow-lg shadow-lime-500/30">
                <VentureLogo size="lg" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              Dialing Venture Infotech Support...
            </h2>
            <p className="text-sm text-lime-400 font-medium mb-4 animate-pulse">
              Connecting with Executive Isha (IVR Line)
            </p>

            <div className="w-full max-w-xs bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 space-y-1 mb-6">
              {caller?.name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Caller Name:</span>
                  <span className="font-semibold text-white truncate max-w-[140px]">{caller.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Caller Email:</span>
                <span className="font-semibold text-white truncate max-w-[140px]">{caller?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile Phone:</span>
                <span className="font-semibold text-white">{caller?.phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <PhoneCall className="w-4 h-4 text-lime-400 animate-bounce" />
              <span>Connecting to Executive Isha...</span>
            </div>
          </div>
        )}

        {callStatus === "connected" && caller && (
          <ActiveCallInterface
            caller={caller}
            onEndCall={handleEndCall}
            voiceSettings={voiceSettings}
            onUpdateSettings={setVoiceSettings}
          />
        )}

        {callStatus === "ended" && caller && (
          <CallSummaryModal
            caller={caller}
            messages={completedMessages}
            durationSec={callDurationSec}
            onRestart={handleRestart}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/90 py-3 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Venture Infotech Support • Official IVR Calling Line • All calls recorded for quality & training</span>
          </div>
          <div>
            Powered by <span className="text-lime-400 font-semibold">Gemini 3.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
