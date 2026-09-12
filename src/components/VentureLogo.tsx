import React, { useState } from "react";

interface VentureLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  withText?: boolean;
  animated?: boolean;
}

export const VentureLogo: React.FC<VentureLogoProps> = ({
  size = "md",
  className = "",
  withText = false,
  animated = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
    xl: "w-28 h-28",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative ${sizeClasses[size]} flex items-center justify-center rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-1.5 shadow-xl shadow-lime-500/10 border border-lime-500/20 overflow-hidden ${
          animated ? "animate-pulse ring-2 ring-lime-400/40" : ""
        }`}
      >
        {!imgFailed ? (
          <img
            src="/venture-logo.jpg"
            alt="Venture Support Logo"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain rounded-xl drop-shadow-[0_4px_12px_rgba(132,204,22,0.35)]"
          />
        ) : (
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-[0_4px_12px_rgba(132,204,22,0.4)]"
          >
            <defs>
              <linearGradient id="limeRibbon1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d9f99d" />
                <stop offset="40%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
              <linearGradient id="limeRibbon2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="50%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#14532d" />
              </linearGradient>
              <linearGradient id="limeHighlight" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#bef264" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>

            {/* Stylized Venture 'S' ribbon */}
            <path
              d="M 52 14 C 62 14, 70 24, 60 38 L 44 60 C 38 68, 42 76, 52 76 C 58 76, 62 72, 64 68 C 66 74, 64 82, 52 86 C 36 86, 26 74, 34 60 L 50 38 C 56 30, 52 24, 44 24 C 38 24, 34 28, 32 32 C 30 24, 36 14, 52 14 Z"
              fill="url(#limeRibbon1)"
            />
            <path
              d="M 64 36 C 74 44, 78 54, 72 68 C 66 82, 54 86, 44 86 C 34 86, 26 80, 24 74 C 28 74, 34 76, 40 74 C 48 71, 56 65, 60 54 C 64 43, 60 38, 54 36 Z"
              fill="url(#limeHighlight)"
              opacity="0.9"
            />
            <path
              d="M 32 30 C 24 40, 20 52, 26 64 C 28 54, 34 46, 42 38 L 56 22 C 50 16, 40 18, 32 30 Z"
              fill="url(#limeRibbon2)"
            />
          </svg>
        )}
      </div>

      {withText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-white ${textSizes[size]}`}>
            Venture Support
          </span>
          <span className="text-xs font-semibold tracking-wider uppercase text-lime-400">
            24/7 Voice Line
          </span>
        </div>
      )}
    </div>
  );
};
