import React, { useState } from "react";
import { VentureLogo } from "./VentureLogo";
import { CallerInfo, Message } from "../types";
import { CheckCircle2, Copy, Check, RotateCcw, Clock, Mail, Phone, FileText, User } from "lucide-react";

interface CallSummaryModalProps {
  caller: CallerInfo;
  messages: Message[];
  durationSec: number;
  onRestart: () => void;
}

export const CallSummaryModal: React.FC<CallSummaryModalProps> = ({
  caller,
  messages,
  durationSec,
  onRestart,
}) => {
  const [copied, setCopied] = useState(false);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const handleCopy = () => {
    const transcriptText = messages
      .map((m) => `[${m.timestamp}] ${m.role === "user" ? caller.name || "Caller" : "Venture Support"}: ${m.text}`)
      .join("\n\n");

    const fullSummary = `VENTURE INFOTECH SUPPORT CALL TRANSCRIPT\nExecutive: Isha (IVR Line)\nCaller Name: ${caller.name || "Caller"}\nCaller Email: ${caller.email}\nCaller Phone: ${caller.phone}\nDuration: ${formatDuration(durationSec)}\nDate: ${new Date().toLocaleString()}\n\n--- TRANSCRIPT ---\n${transcriptText}`;

    navigator.clipboard.writeText(fullSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const ticketId = `VI-${Math.floor(100000 + Math.random() * 900000)}`;

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
      <div className="flex flex-col items-center text-center mb-6">
        <VentureLogo size="lg" className="mb-3" />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Call Concluded Successfully • Executive Isha
        </div>
        <h2 className="text-2xl font-bold text-white">
          Venture Infotech Support Call Summary
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Support Ticket Ref: <span className="font-mono text-lime-400 font-semibold">{ticketId}</span>
        </p>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block mb-1">Duration</span>
          <div className="flex items-center gap-1.5 text-white font-bold text-sm">
            <Clock className="w-4 h-4 text-lime-400" />
            <span>{formatDuration(durationSec)}</span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block mb-1">Caller Name</span>
          <div className="flex items-center gap-1.5 text-white font-bold text-xs truncate">
            <User className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <span className="truncate">{caller.name || "Caller"}</span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block mb-1">Email Verified</span>
          <div className="flex items-center gap-1.5 text-white font-bold text-xs truncate">
            <Mail className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <span className="truncate">{caller.email}</span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block mb-1">Mobile Contact</span>
          <div className="flex items-center gap-1.5 text-white font-bold text-xs truncate">
            <Phone className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <span className="truncate">{caller.phone}</span>
          </div>
        </div>
      </div>

      {/* Transcript Excerpt */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          <span>Call Transcript ({messages.length} messages)</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-lime-400 hover:text-lime-300 transition-colors lowercase"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>copy all</span>
              </>
            )}
          </button>
        </div>

        <div className="max-h-48 overflow-y-auto bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
          {messages.map((m) => (
            <div key={m.id} className="leading-relaxed">
              <span className={`font-semibold ${m.role === "user" ? "text-emerald-400" : "text-lime-400"}`}>
                {m.role === "user" ? caller.name || "Caller" : "Venture Support"}:
              </span>{" "}
              <span className="text-slate-300">{m.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Transcript Copied!" : "Export Call Record"}</span>
        </button>

        <button
          onClick={onRestart}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 hover:brightness-105 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-500/20"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Start New Voice Call</span>
        </button>
      </div>
    </div>
  );
};
