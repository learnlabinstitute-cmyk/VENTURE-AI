export interface CallerInfo {
  email: string;
  phone: string;
  plan?: "Silver Plan" | "Gold Plan" | "Platinum Plan" | string;
  reason?: string;
  name?: string;
}

export type CallStatus = "registering" | "connecting" | "connected" | "ended";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  isVoice?: boolean;
}

export interface VoiceSettings {
  voiceName: string;
  rate: number;
  pitch: number;
  autoListen: boolean;
  soundEffects: boolean;
  model: "gemini-3.1-flash-lite" | "gemini-3.1-pro-preview" | "gemini-3.8-flash";
}
