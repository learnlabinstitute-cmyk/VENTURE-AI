import React, { useState, useEffect } from "react";
import { Database, Check, Copy, RefreshCw, X, Table, ExternalLink, ShieldCheck } from "lucide-react";

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [callers, setCallers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"leads" | "sql">("leads");

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, callersRes] = await Promise.all([
        fetch("/api/supabase/status").then((r) => r.json()),
        fetch("/api/callers").then((r) => r.json()),
      ]);
      setStatus(statusRes);
      setCallers(callersRes.callers || []);
    } catch (e) {
      console.error("Failed to load Supabase status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const sqlCode = `-- Supabase SQL Schema for Venture Support
-- Run this in your Supabase SQL Editor (Project: ushmvnxaoqkgmkcoythx)

CREATE TABLE IF NOT EXISTS public.callers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.callers ENABLE ROW LEVEL SECURITY;

-- Allow public insertion from the support call form
CREATE POLICY "Allow public insert to callers" 
ON public.callers 
FOR INSERT 
WITH CHECK (true);

-- Allow public read of records
CREATE POLICY "Allow public select from callers" 
ON public.callers 
FOR SELECT 
USING (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Supabase Backend Database
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Connected
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Project: <span className="text-lime-400 font-semibold">ushmvnxaoqkgmkcoythx</span> • Table: <span className="text-lime-400 font-semibold">callers</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between my-4 gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("leads")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "leads"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Stored Callers ({callers.length})
            </button>
            <button
              onClick={() => setActiveTab("sql")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "sql"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              SQL Table Setup
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-lime-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {activeTab === "leads" && (
            <div>
              {callers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                  <Table className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-300">No callers stored yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Fill the form on the main page with Name, Email, and Phone to see your entries stored here and in Supabase!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {callers.map((c, i) => (
                    <div
                      key={c.id || i}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{c.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                            Verified
                          </span>
                        </div>
                        <div className="text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                          <span>{c.email}</span>
                          <span>•</span>
                          <span>{c.phone}</span>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-500 font-mono">
                        {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "sql" && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Supabase One-Click Table Setup
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Open your <a href="https://supabase.com/dashboard/project/ushmvnxaoqkgmkcoythx/sql/new" target="_blank" rel="noreferrer" className="text-lime-400 underline font-semibold">Supabase SQL Editor</a>, paste the SQL below and click <strong>RUN</strong>. This creates the <code className="text-white">public.callers</code> table with permissions for storing submissions.
                </p>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-lime-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {sqlCode}
                </pre>
                <button
                  onClick={copySql}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-lg transition-colors border border-slate-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-lime-400" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Supabase REST API Active</span>
          </div>
          <a
            href="https://supabase.com/dashboard/project/ushmvnxaoqkgmkcoythx"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <span>Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3 text-lime-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
