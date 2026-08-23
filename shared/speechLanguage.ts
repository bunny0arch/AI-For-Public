export const conversationLanguages = ["English", "हिन्दी", "తెలుగు"] as const;
export type ConversationLanguage = (typeof conversationLanguages)[number];

export function inferSpeechLanguage(text: string, fallback: ConversationLanguage): ConversationLanguage {
  if (fallback !== "English") return fallback;
  if (/[\u0C00-\u0C7F]/.test(text)) return "తెలుగు";
  if (/[\u0900-\u097F]/.test(text)) return "हिन्दी";
  return fallback;
}
