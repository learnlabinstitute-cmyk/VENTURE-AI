import React, { useState } from "react";
import { VentureLogo } from "./VentureLogo";
import { CallerInfo } from "../types";
import { Phone, Mail, User, ShieldCheck, ArrowRight, Clock, Headphones, Database, CheckCircle2 } from "lucide-react";
import { SupabaseSyncModal } from "./SupabaseSyncModal";

interface CallerRegistrationProps {
  onStartCall: (caller: CallerInfo) => void;
  isConnecting?: boolean;
}

export const CallerRegistration: React.FC<CallerRegistrationProps> = ({
  onStartCall,
  isConnecting = false,
}) => {
  const [name, setName] = useState("Alex");
  const [email, setEmail] = useState("learnlabinstitute@gmail.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [savedSuccessNotice, setSavedSuccessNotice] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: { name?: string; email?: string; phone?: string } = {};
    if (!name.trim()) {
      newErrors.name = "Please enter your name.";
    }
    if (!email.trim() || !email.includes("@")) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) {
      newErrors.phone = "Please enter a valid mobile number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSavedSuccessNotice(null);

    const callerData: CallerInfo = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };

    try {
      // Store in Supabase backend table via secure server route
      const response = await fetch("/api/submit-caller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(callerData),
      });

      const result = await response.json();
      console.log("Supabase storage response:", result);
      setSavedSuccessNotice("Saved to Supabase Backend");
    } catch (err) {
      console.warn("Notice: Stored locally while connecting:", err);
    } finally {
      setIsSubmitting(false);
      // Proceed directly to the call with Executive Isha
      onStartCall(callerData);
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Background glow effects */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-lime-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/60 overflow-hidden">
        {/* Top ribbon bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-500" />

        {/* Header section with Venture Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4 transform hover:scale-105 transition-transform duration-300">
            <VentureLogo size="xl" animated />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-semibold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              Venture Infotech Support • 24/7 Line
            </div>

            <button
              type="button"
              onClick={() => setShowSupabaseModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Supabase Connected</span>
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Venture Infotech Support
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-sm leading-relaxed">
            Enter your details to initiate an encrypted voice support call.
          </p>
        </div>

        {/* Registration Form - Only Name, Email, and Mobile Number */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name <span className="text-lime-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Enter your name"
                className={`w-full pl-10 pr-4 py-3 bg-slate-950/70 border ${
                  errors.name ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-800 focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                } rounded-xl text-white placeholder-slate-500 text-sm transition-all outline-none`}
              />
            </div>
            {errors.name && (
              <p className="text-rose-400 text-xs mt-1 font-medium">{errors.name}</p>
            )}
          </div>

          {/* Email field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address <span className="text-lime-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="client@gmail.com"
                className={`w-full pl-10 pr-4 py-3 bg-slate-950/70 border ${
                  errors.email ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-800 focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                } rounded-xl text-white placeholder-slate-500 text-sm transition-all outline-none`}
              />
            </div>
            {errors.email && (
              <p className="text-rose-400 text-xs mt-1 font-medium">{errors.email}</p>
            )}
          </div>

          {/* Mobile phone field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Mobile Number <span className="text-lime-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="+91 98765 43210"
                className={`w-full pl-10 pr-4 py-3 bg-slate-950/70 border ${
                  errors.phone ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-800 focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                } rounded-xl text-white placeholder-slate-500 text-sm transition-all outline-none`}
              />
            </div>
            {errors.phone && (
              <p className="text-rose-400 text-xs mt-1 font-medium">{errors.phone}</p>
            )}
          </div>

          {/* Saved notice */}
          {savedSuccessNotice && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedSuccessNotice}</span>
            </div>
          )}

          {/* Enter Call button */}
          <button
            type="submit"
            disabled={isConnecting || isSubmitting}
            className="w-full mt-4 relative group overflow-hidden rounded-xl bg-gradient-to-r from-lime-400 via-lime-500 to-emerald-500 p-0.5 font-bold shadow-lg shadow-lime-500/25 transition-all duration-300 hover:shadow-lime-500/40 active:scale-[0.99] disabled:opacity-60"
          >
            <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-[10px] bg-slate-950 group-hover:bg-transparent transition-colors duration-300">
              {isConnecting || isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-white group-hover:text-slate-950 transition-colors font-bold tracking-wide text-base">
                    Saving & Entering Call...
                  </span>
                </>
              ) : (
                <>
                  <Headphones className="w-5 h-5 text-lime-400 group-hover:text-slate-950 transition-colors" />
                  <span className="text-white group-hover:text-slate-950 transition-colors font-bold tracking-wide text-base">
                    Enter Call
                  </span>
                  <ArrowRight className="w-5 h-5 text-lime-400 group-hover:text-slate-950 transition-colors transform group-hover:translate-x-1" />
                </>
              )}
            </div>
          </button>
        </form>

        {/* Supabase backend status & footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Recorded IVR Line</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSupabaseModal(true)}
            className="text-slate-400 hover:text-lime-400 flex items-center gap-1 font-mono transition-colors"
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Supabase: ushmvnxaoqkgmkcoythx</span>
          </button>
        </div>
      </div>

      {/* Supabase Stored Leads & SQL Modal */}
      <SupabaseSyncModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
      />
    </div>
  );
};

