/**
 * AgroGuide — same API pattern as NegotiationArena (POST /api/price-negotiation/chat).
 * Uses mode: 'agro_guide' for non-streaming JSON { reply }.
 * API base: empty in dev (Vite proxy to localhost:5000), or set VITE_API_BASE for production.
 */

import { AGROGUIDE_SYSTEM_PROMPT } from "@/lib/agroGuideKnowledge";

const API_BASE = (import.meta.env.VITE_API_BASE as string) ?? "";

export interface AgroGuideMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  language?: string;
}

/** Check if AgroGuide backend is reachable and configured (DEEPSEEK_API_KEY). */
export async function getAgroGuideStatus(): Promise<{ configured: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/price-negotiation/agro-guide-status`, { method: "GET" });
    const data = await res.json().catch(() => ({}));
    return {
      configured: !!(data as { configured?: boolean }).configured,
      message: (data as { message?: string }).message ?? (res.ok ? "OK" : "Server error"),
    };
  } catch {
    return { configured: false, message: "Cannot reach server. Is the backend running on port 5000?" };
  }
}

export async function getAgroGuideResponse(
  userMessage: string,
  history: AgroGuideMessage[],
  languageCode: string,
  languageName: string,
  languageNative: string,
  pageContext: string
): Promise<string> {
  const messagesToSend = history.slice(-12).map((m) => ({ role: m.role, content: (m.content || "").trim() || " " }));
  const body = {
    mode: "agro_guide",
    messages: messagesToSend,
    systemPrompt: AGROGUIDE_SYSTEM_PROMPT,
    pageContext,
    selectedLanguage: {
      code: languageCode,
      name: languageName,
      native: languageNative,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/price-negotiation/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    throw new Error(msg.includes("fetch") || msg.includes("Failed") ? "Cannot reach server. Is the backend running on port 5000?" : msg);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    throw new Error("Server returned streaming response. Restart the backend (npm run dev in server folder) so AgroGuide uses the correct API.");
  }

  const data = await res.json().catch(() => ({}));
  const reply = (data as { reply?: string }).reply;

  if (!res.ok) {
    if (typeof reply === "string" && reply.trim()) return reply;
    const err = (data as { error?: string }).error;
    throw new Error(err || `Server error (${res.status})`);
  }

  return typeof reply === "string" ? reply : "The assistant didn't return text. Please try again.";
}
