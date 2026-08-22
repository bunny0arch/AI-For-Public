export type ScopedChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const TEXT_ONLY_CROP_DIAGNOSIS_PATTERN = /fungal\s+diseases?|fungal\s+infections?|bacterial\s+spot|early\s+blight|late\s+blight|alternaria|botrytis|root\s+rot|leaf\s+blight/i;
const CROP_SYMPTOM_PATTERN = /tomato|crop|plant|leaf|leaves|brown\s+spots?|yellowing|paddy|rice|wheat|chilli/i;

export function applyFarmingSafetyGuard(communityId: string, content: string, messages: ScopedChatMessage[]): string {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const isTextOnlyCropObservation = communityId === "farmers" && CROP_SYMPTOM_PATTERN.test(latestUserMessage);

  if (isTextOnlyCropObservation && TEXT_ONLY_CROP_DIAGNOSIS_PATTERN.test(content)) {
    return `A text description alone cannot confirm what is causing the brown spots. Before deciding on any treatment, record a few visible details: whether the spots have light or dark borders, whether they begin on older or newer leaves, whether stems or fruits are affected, and how long leaves stay wet after rain.

If you can, share a clear photo of both the affected and a healthy leaf, taken in daylight. For a diagnosis or treatment decision, confirm the observation with a local agricultural extension worker or an official advisory for your area.`;
  }

  return content;
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .filter((part): part is { type: "text"; text: string } =>
        Boolean(part && typeof part === "object" && (part as { type?: unknown }).type === "text" && typeof (part as { text?: unknown }).text === "string")
      )
      .map((part) => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Provider request failed with ${response.status}`);
  }
  return response.json();
}

async function generateWithGemini(systemPrompt: string, messages: ScopedChatMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini is not configured");

  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 700,
    },
  };

  const data = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  ) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

async function generateWithOpenRouter(systemPrompt: string, messages: ScopedChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter is not configured");

  const data = await fetchJson("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "cohere/command-r7b-12-2024",
      temperature: 0.25,
      max_tokens: 700,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  }) as { choices?: Array<{ message?: { content?: unknown } }> };

  const text = extractText(data.choices?.[0]?.message?.content);
  if (!text) throw new Error("OpenRouter returned no text");
  return text;
}

export async function generateScopedResponse(communityId: string, systemPrompt: string, messages: ScopedChatMessage[]): Promise<{ content: string; provider: "gemini" | "openrouter" }> {
  try {
    return { content: applyFarmingSafetyGuard(communityId, await generateWithGemini(systemPrompt, messages), messages), provider: "gemini" };
  } catch (geminiError) {
    try {
      return { content: applyFarmingSafetyGuard(communityId, await generateWithOpenRouter(systemPrompt, messages), messages), provider: "openrouter" };
    } catch (openRouterError) {
      const geminiMessage = geminiError instanceof Error ? geminiError.message : "unknown Gemini error";
      const fallbackMessage = openRouterError instanceof Error ? openRouterError.message : "unknown OpenRouter error";
      throw new Error(`No response provider was available: ${geminiMessage}; fallback: ${fallbackMessage}`);
    }
  }
}
