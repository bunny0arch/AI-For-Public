import type { ConversationLanguage } from "../shared/speechLanguage";

export type GuideSpeechLanguage = ConversationLanguage;

const SARAH_MULTILINGUAL_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

const languageCodeByPreference: Record<GuideSpeechLanguage, string> = {
  English: "en",
  "हिन्दी": "hi",
  "తెలుగు": "",
};

export function prepareGuideSpeech(text: string, language: GuideSpeechLanguage) {
  const cleanedText = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1_500);

  if (!cleanedText) throw new Error("There is no guide response to speak yet.");

  const languageCode = languageCodeByPreference[language];
  return {
    voiceId: SARAH_MULTILINGUAL_VOICE_ID,
    payload: {
      text: cleanedText,
      model_id: "eleven_multilingual_v2",
      ...(languageCode ? { language_code: languageCode } : {}),
      voice_settings: {
        stability: 0.52,
        similarity_boost: 0.78,
        style: 0.18,
        use_speaker_boost: true,
      },
    },
  };
}

export async function synthesizeGuideSpeech(text: string, language: GuideSpeechLanguage) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("Guide voice is not configured.");

  const { voiceId, payload } = prepareGuideSpeech(text, language);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Guide voice could not be prepared right now.");
  }

  const audio = Buffer.from(await response.arrayBuffer()).toString("base64");
  return { audioBase64: audio, contentType: "audio/mpeg" as const };
}
