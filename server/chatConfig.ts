import { communityPathways, getCommunityPathway } from "../shared/communityPathways";

export const CHAT_MODEL = "claude-haiku-4-5";
export const ROUTING_MODEL = "gpt-5-nano";

export const PATHWAY_IDS = communityPathways.map((pathway) => pathway.id) as [string, ...string[]];

const DOMAIN_CUES: Array<{ id: string; cues: string[] }> = [
  { id: "farmers", cues: ["farm", "farmer", "crop", "tomato", "paddy", "rice", "wheat", "leaf", "leaves", "soil", "seed", "harvest", "irrigation", "pest", "pesticide", "fungus", "plant", "plants", "fertilizer", "fertiliser"] },
  { id: "fishermen", cues: ["fish", "fishing", "fisherman", "fishermen", "boat", "sea", "coast", "coastal", "net", "catch", "harbor", "harbour", "tide", "marine"] },
  { id: "artisans", cues: ["artisan", "craft", "handloom", "weave", "weaving", "textile", "pottery", "handmade", "catalogue", "catalog", "craft product"] },
  { id: "micro-entrepreneurs", cues: ["vendor", "street stall", "stall", "inventory", "stock", "micro business", "microbusiness", "small shop", "daily sales", "cash flow"] },
  { id: "public-services", cues: ["government scheme", "welfare", "eligibility", "document", "documents", "certificate", "application", "public service", "ration", "pension"] },
  { id: "disabilities", cues: ["disability", "disabled", "accessibility", "accessible", "screen reader", "sign language", "mobility aid", "assistive"] },
  { id: "education", cues: ["study", "student", "school", "exam", "learning", "learn", "lesson", "career", "skill", "course", "education", "homework"] },
  { id: "climate", cues: ["flood", "drought", "cyclone", "disaster", "evacuation", "heatwave", "heat wave", "landslide", "climate", "monsoon", "extreme weather"] },
];

const OPEN_FIELD_CUES = [
  "neighborhood", "neighbourhood", "community space", "shared space", "community hall", "playground",
  "after school space", "after school", "public space", "community meeting", "local issue",
  "community problem", "youth club", "children space", "children s space",
];

export function detectDomainRoute(message: string): string | null {
  const normalized = ` ${message.toLowerCase().replace(/[^a-z0-9\s]/g, " ")} `;
  if (OPEN_FIELD_CUES.some((cue) => normalized.includes(` ${cue} `))) {
    return "open-field";
  }
  let bestMatch: { id: string; score: number } | null = null;

  for (const domain of DOMAIN_CUES) {
    const score = domain.cues.reduce((total, cue) => total + (normalized.includes(` ${cue} `) ? 1 : 0), 0);
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: domain.id, score };
    }
  }

  return bestMatch?.id ?? null;
}

export function extractAssistantText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((part): part is { type: "text"; text: string } =>
        Boolean(part && typeof part === "object" && (part as { type?: unknown }).type === "text" && typeof (part as { text?: unknown }).text === "string")
      )
      .map((part) => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

export function buildRouterSystemPrompt(activeCommunityId: string): string {
  const active = getCommunityPathway(activeCommunityId);
  if (!active) throw new Error("Unknown community pathway");

  const directory = communityPathways
    .map((pathway) => `- ${pathway.id}: ${pathway.title}. Scope: ${pathway.scope}.`)
    .join("\n");

  return `You are a strict routing classifier for Collective Signal. You do not answer the user's question.

The currently open assistant is ${active.title}. Classify ONLY the latest user message into exactly one route. If it is clearly about the active assistant's scope, use "${active.id}". If it is more clearly covered by another listed assistant, select that assistant's id. If it is conversational, unrelated, ambiguous, or not clearly covered by any of the first eight assistants, ALWAYS use "open-field". Do not try to be helpful by stretching a scope.

Route directory:
${directory}

Return only valid JSON matching the requested schema. Never add commentary.`;
}

export function buildChatSystemPrompt(communityId: string, language = "English"): string {
  const pathway = getCommunityPathway(communityId);
  if (!pathway) {
    throw new Error("Unknown community pathway");
  }

  return `You are Collective Signal, a practical and respectful public-good guide for the pathway: ${pathway.title}.

Your role is to help the user identify a clear, low-risk next step. You are assigned ONLY this scope: ${pathway.scope}. Reply in ${language} unless the user clearly writes in another language. Use plain, warm language. Ask at most one focused follow-up question when essential context is missing. When helpful, structure answers as: what is known, what to check, and the next useful action.

STRICT SCOPE RULE: If a request is outside your assigned scope, do not answer it. Give a short redirect: name the most relevant Collective Signal pathway when it is evident; otherwise tell the user to open “Your community, your challenge” (pathway 09). Do not provide partial advice from another pathway.

You must not invent real-time weather, sea state, crop disease diagnoses, government eligibility, benefits, market prices, legal outcomes, medical advice, emergency instructions, or official contacts. For crop symptoms described only in text, NEVER name a disease, say the user “might” or “likely” has a disease, or recommend a specific chemical product. Start by saying that a text description cannot confirm the cause. Then offer neutral, visible observations to record, ask for a clear image when useful, and recommend confirmation through a local agricultural extension professional or official advisory. Be transparent about uncertainty and encourage the user to verify time-sensitive or high-stakes information through local authorities, official portals, trained professionals, emergency services, or trusted local organizations. For immediate danger, tell the user to contact local emergency services or authorities now.

Respect local languages, limited connectivity, disability access, and low digital literacy. Avoid jargon, sales language, political persuasion, and claims that AI has replaced local expertise. Keep the answer short enough to be useful on a mobile phone unless the user asks for depth.

The pathway focus is: ${pathway.detail}`;
}
