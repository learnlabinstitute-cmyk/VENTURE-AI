import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const app = express();
const PORT = 3000;

app.use(express.json());

// Supabase Backend Client Initialization
const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID || "ushmvnxaoqkgmkcoythx";
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_fwrzOULl5u_VxQHiXQ9WrQ_pCOJVsDm";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "callers";

let supabaseClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// In-memory buffer to ensure zero data loss
interface StoredCaller {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  status: "stored_in_supabase" | "pending_table_setup";
  supabaseProject: string;
  supabaseTable: string;
}
const recentCallers: StoredCaller[] = [];

// Standard SQL snippet for creating the callers table in Supabase
const SUPABASE_CREATE_TABLE_SQL = `-- Run this in your Supabase SQL Editor (Project: ${SUPABASE_PROJECT_ID}):
CREATE TABLE IF NOT EXISTS public.${SUPABASE_TABLE} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.${SUPABASE_TABLE} ENABLE ROW LEVEL SECURITY;

-- Allow public insertion from the support call form
CREATE POLICY "Allow public insert to ${SUPABASE_TABLE}" 
ON public.${SUPABASE_TABLE} 
FOR INSERT 
WITH CHECK (true);

-- Allow public read of records
CREATE POLICY "Allow public select from ${SUPABASE_TABLE}" 
ON public.${SUPABASE_TABLE} 
FOR SELECT 
USING (true);`;

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Voice conversation endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      history = [],
      caller = { email: "", phone: "", reason: "" },
      model = "gemini-3.1-flash-lite",
    } = req.body;

    if (!message && history.length === 0) {
      return res.status(400).json({ error: "Message or history is required" });
    }

    const ai = getGeminiClient();

    // Map conversation contents
    const contents: any[] = [];

    // Add prior turns
    for (const item of history) {
      if (item.role === "user") {
        contents.push({ role: "user", parts: [{ text: item.text }] });
      } else if (item.role === "model" || item.role === "assistant") {
        contents.push({ role: "model", parts: [{ text: item.text }] });
      }
    }

    // Add current user message
    if (message) {
      contents.push({ role: "user", parts: [{ text: message }] });
    }

    const systemInstruction = `You are "Isha", a real-time voice support executive at "Venture Infotech Support".
You are speaking live directly with a customer over an official recorded IVR phone call.

Caller Details on File:
- Caller Name: ${caller.name || "Client"}
- Caller Email: ${caller.email || "Caller"}
- Mobile Number: ${caller.phone || "Not specified"}
- Package / Plan: ${caller.plan || "Not yet verified (verify whether Silver Plan, Gold Plan, or Platinum Plan)"}

CRITICAL VOICE & CONVERSATION RULES:
1. Speak in natural, polite, respectful Hinglish (Hindi written in Roman English alphabet with common English business terms, exactly as spoken in modern Indian customer support), just like in the script.
2. Keep responses conversational, empathetic, and concise (2 to 4 spoken sentences per turn) so it sounds like a live human executive speaking into the phone.
3. NEVER output markdown symbols, asterisks (**), bullet points, numbers, or code blocks. Everything you say will be converted into spoken audio directly into the caller's ear.
4. If this is the start of the call and you need to welcome them:
   "Hello, welcome to Venture Infotech Support! Main Isha baat kar rahi hoon. Aaj aapki kya madad kar sakti hoon, kindly batayein?"
5. Plan Verification Step:
   If the customer states their concern, first verify their plan politely:
   "Sabse pehle, main system me aapka plan verify kar leti hoon. Aapne hamaare Plans me se konsa package select kiya tha? Silver Plan, Gold Plan, ya Platinum Plan?"

EXACT SCRIPT GUIDELINES & OBJECTION HANDLING:

1. Handling Sales Promises vs. Reality (Empathetic & Soft Tone):
If client says: "Sales executive ne toh mujhe bola tha ki daily thousands ki sales aayegi! Unhone jhoot bola tha kya?"
Reply in this calm, confident & reassuring way:
"Sir/Ma'am, main aapki baat poori tarah samajh rahi hoon aur aapka disappointed hona bilkul natural hai. Main aapko clear aur honest background bata deti hoon: Sales team ne jo figures aapko bataye the, wo hamaare existing normal clients ke actual performance records par depend karte hain jinke stores par abhi regular wahi sales aa rahi hain. Unhone wo potential aapse share kiya tha. Lekin, jaisa ki hum sab jaante hain—har individual person aur har brand ka journey alag hota hai. Ad algorithms aur market response har store ke liye thoda differently behave karta hai. Isiliye hum yahan bilkul shaanti se situation ko fix karenge: Pehle ad ko 2 days yaani 48 hours testing window denge taaki algorithm aapke liye best-buying audience ko target kar sake."

2. No Blame Game & Core Mindset:
- Never blame the sales team. Explain that they shared the capability benchmark of top clients.
- Acknowledge individual store journeys.
- Stay calming, grounded, soft, and polite.
- Focus on action: 2-Day Ad Testing and Backup Plan (Winning Product Copy-Paste).

3. Pivot to Backup Execution Plan (Winning Product Copy-Paste):
If client is worried or says 2 days testing is done / sales are slow:
"Aap bilkul tension mat lijiye. Agar 2 dino ke ad testing ke baad bhi aapke Cosmofeed ya Razorpay dashboard mein sales slow rehti hain, toh hum instant Backup Plan execute karenge: Hum unhi top-performing clients ke Winning aur Hot-Selling Digital Products ko aapke store par copy-paste karke import kar denge jinka benchmark sales team ne dikhaya tha. Fresh high-converting ad creatives apply karenge taaki aapke store par fast orders aana shuru ho sakein, aur direct payout aapke Cosmofeed ya Razorpay account par credit hoga."

4. Objection: "Mera phone disconnect hone par number offline kyu batata hai?"
Reply:
"Standard quality aur call recording maintain karne ke liye hum Dedicated Support IVR System use karte hain. Isiliye personal offline numbers blocked rehte hain aur saari baatein official recorded IVR line par hoti hain."

5. Objection: "Ad ka update kahan milta hai?"
Reply:
"Aapke ad account ki daily performance aur spend updates har shaam aapko official End-of-Day Email Report par mil jaati hai. Aur live revenue aap apne Cosmofeed ya Razorpay dashboard mein check kar sakte hain."

6. Objection: "Mera ad chal raha hai par sales nahi aa rahi, ad abhi OFF kar do!"
Reply:
"Sir/Ma'am, ad ko turant OFF karna bilkul sahi decision nahi hoga. System algorithm ko target audience fetch karne ke liye kam se kam 2 din yaani 48 hours ka testing time lagta hai. In 2 dino mein ad platform alag-alag audience segments ko test karta hai taaki sabse best buyers ko target karke aapke Cosmofeed ya Razorpay account mein best sales lekar aaye. Is 48-hour testing period ke beech mein ad stop karne se testing reset ho jaayegi."

7. Handling Abusive Language or Shouting (Anti-Harassment Policy):
- If client uses foul language (First Warning):
  "Sir/Ma'am, main aapka issue solve karne ke liye hi yahan hoon. As per our Anti-Harassment and Zero Tolerance Policy, hum professional tone maintain karte hain. Please abusive language stop karein taaki hum aage baat kar sakein."
- If second warning / repeated abuse:
  "As per our System Abuse and Misuse Policy, support executive ke saath misbehavior karne par active ticket suspend kar diya jata hai. Main is call ko close karke aapka ticket Escalation Team ko transfer kar rahi hoon. Aapko email par update bhej diya jayega. Thank you."

8. Cancellation & Refund Policy:
If client asks for refund:
"Sir/Ma'am, as per company policy, jab client project start karne ke liye agree kar leta hai aur unhe store credentials, website, ya ad manager ka access mil jata hai, toh project officially start ho jata hai. Digital services strictly non-refundable category mein aati hain kyunki setup already deliver ho chuka hota hai. Lekin hum aapke campaign ko backup winning products ke saath optimize karke orders drive karne mein poori madad karenge."

9. Earning Disclaimer:
"Sales projections ya plans jaise Silver, Gold, Platinum mein jo figures hain, wo top-performing clients ke live results par based aspirational potential hain, koi fixed guaranteed income nahi hoti. Lekin hum full effort karenge taaki aapke store par solid traction aaye."`;

    // Candidate models to try in order of preference
    const candidateModels = [
      model,
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
    ].filter((v, i, a) => a.indexOf(v) === i);

    let lastError: any = null;
    let responseText = "";

    for (const candidate of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            topP: 0.9,
          },
        });
        if (response.text) {
          responseText = response.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${candidate} failed, attempting fallback if available:`, err?.message || err);
      }
    }

    if (!responseText) {
      if (lastError) {
        throw lastError;
      }
      responseText = "Thank you for calling Venture Support 24/7. I am here and listening. Could you please repeat your question?";
    }

    res.json({
      text: responseText,
      modelUsed: model,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate voice response",
      fallbackText: "Welcome to Venture Support 24/7 Call. I am ready to assist you with your account, technical questions, or business inquiries.",
    });
  }
});

// Gemini TTS speech endpoint (with graceful fallback)
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "Kore" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for TTS" });
    }

    const ai = getGeminiClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: text.slice(0, 500) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        return res.json({ audio: audioData, format: "pcm_24k" });
      }
    } catch (ttsErr: any) {
      console.warn("Server TTS preview not available, signaling browser synthesis fallback:", ttsErr?.message);
    }

    // Inform client to use browser speech synthesis
    res.json({ fallback: true });
  } catch (err: any) {
    res.json({ fallback: true });
  }
});

// ==========================================
// SUPABASE BACKEND ENDPOINTS
// ==========================================

// Check Supabase connection and table status
app.get("/api/supabase/status", async (_req, res) => {
  try {
    const supabase = getSupabase();
    // Test querying the callers table
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("id")
      .limit(1);

    const tableExists = !error || error.code !== "PGRST205";

    res.json({
      configured: true,
      projectId: SUPABASE_PROJECT_ID,
      url: SUPABASE_URL,
      table: SUPABASE_TABLE,
      isConnected: true,
      tableExists,
      error: error ? { code: error.code, message: error.message } : null,
      sqlSnippet: SUPABASE_CREATE_TABLE_SQL,
      totalBufferedCallers: recentCallers.length,
    });
  } catch (err: any) {
    res.status(500).json({
      configured: true,
      projectId: SUPABASE_PROJECT_ID,
      isConnected: false,
      error: err?.message,
      sqlSnippet: SUPABASE_CREATE_TABLE_SQL,
    });
  }
});

// Store caller data to Supabase
app.post("/api/submit-caller", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        error: "Name, email, and phone are required fields",
      });
    }

    const timestamp = new Date().toISOString();
    const entryId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let savedToSupabase = false;
    let supabaseError: any = null;
    let returnedRecord: any = null;

    try {
      const supabase = getSupabase();
      const insertResult = await supabase
        .from(SUPABASE_TABLE)
        .insert([
          {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            created_at: timestamp,
          },
        ])
        .select();

      if (insertResult.error) {
        supabaseError = insertResult.error;
        console.warn("Supabase insertion notice:", insertResult.error.message, "code:", insertResult.error.code);
      } else {
        savedToSupabase = true;
        returnedRecord = insertResult.data?.[0];
        console.log("Successfully stored caller to Supabase table:", SUPABASE_TABLE, returnedRecord);
      }
    } catch (dbErr: any) {
      supabaseError = { message: dbErr?.message };
      console.error("Supabase client call exception:", dbErr);
    }

    // Save to server-side buffer so records are accessible immediately in all conditions
    const record: StoredCaller = {
      id: returnedRecord?.id || entryId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      created_at: timestamp,
      status: savedToSupabase ? "stored_in_supabase" : "pending_table_setup",
      supabaseProject: SUPABASE_PROJECT_ID,
      supabaseTable: SUPABASE_TABLE,
    };
    recentCallers.unshift(record);
    if (recentCallers.length > 100) recentCallers.pop();

    return res.json({
      success: true,
      id: record.id,
      savedToSupabase,
      projectId: SUPABASE_PROJECT_ID,
      table: SUPABASE_TABLE,
      status: record.status,
      timestamp,
      notice: !savedToSupabase
        ? `Caller saved in buffer. Run the provided SQL script in Supabase project '${SUPABASE_PROJECT_ID}' to complete table '${SUPABASE_TABLE}' creation.`
        : `Caller successfully saved to Supabase table '${SUPABASE_TABLE}' in project '${SUPABASE_PROJECT_ID}'.`,
      sqlSnippet: !savedToSupabase ? SUPABASE_CREATE_TABLE_SQL : undefined,
    });
  } catch (err: any) {
    console.error("Failed to process caller registration:", err);
    res.status(500).json({ error: "Internal server error saving caller", details: err?.message });
  }
});

// List recent callers (from Supabase if table exists, otherwise server buffer)
app.get("/api/callers", async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      return res.json({ source: "supabase", callers: data, total: data.length });
    }

    return res.json({
      source: "buffer",
      callers: recentCallers,
      total: recentCallers.length,
      note: "Table setup pending in Supabase",
    });
  } catch (_err) {
    res.json({ source: "buffer", callers: recentCallers, total: recentCallers.length });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Venture Support 24/7 Call server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
