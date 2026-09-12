import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  volumeLevel?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isListening,
  isSpeaking,
  isProcessing,
  volumeLevel = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 32;
      const barWidth = 4;
      const gap = (width - numBars * barWidth) / (numBars - 1);
      const centerY = height / 2;

      phase += 0.08;

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + gap);
        let amplitude = 6;

        if (isSpeaking) {
          // Energetic harmonic waves when AI is speaking
          amplitude =
            12 +
            Math.sin(phase * 2 + i * 0.4) * 24 +
            Math.cos(phase * 1.5 + i * 0.2) * 14;
        } else if (isListening) {
          // Reactive microphone waves
          const micBoost = Math.max(volumeLevel * 50, 4);
          amplitude =
            8 +
            Math.sin(phase * 3 + i * 0.5) * micBoost +
            Math.cos(phase * 2 + i * 0.3) * (micBoost * 0.6);
        } else if (isProcessing) {
          // Pulsing wave during thinking
          amplitude = 8 + Math.sin(phase * 3 + i * 0.3) * 10;
        } else {
          // Gentle idle shimmer
          amplitude = 4 + Math.sin(phase + i * 0.2) * 3;
        }

        amplitude = Math.max(4, Math.min(height * 0.45, Math.abs(amplitude)));

        // Gradient styling
        const grad = ctx.createLinearGradient(0, centerY - amplitude, 0, centerY + amplitude);
        if (isSpeaking) {
          grad.addColorStop(0, "#bef264"); // lime-300
          grad.addColorStop(0.5, "#84cc16"); // lime-500
          grad.addColorStop(1, "#15803d"); // green-700
        } else if (isListening) {
          grad.addColorStop(0, "#6ee7b7"); // emerald-300
          grad.addColorStop(0.5, "#10b981"); // emerald-500
          grad.addColorStop(1, "#047857"); // emerald-700
        } else if (isProcessing) {
          grad.addColorStop(0, "#38bdf8");
          grad.addColorStop(0.5, "#0284c7");
          grad.addColorStop(1, "#0369a1");
        } else {
          grad.addColorStop(0, "#94a3b8");
          grad.addColorStop(1, "#475569");
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        // Rounded bar
        ctx.roundRect(x, centerY - amplitude, barWidth, amplitude * 2, 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isListening, isSpeaking, isProcessing, volumeLevel]);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={340}
        height={90}
        className="w-full max-w-[340px] h-[90px]"
      />
    </div>
  );
};
