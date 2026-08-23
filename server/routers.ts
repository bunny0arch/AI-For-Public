import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { PATHWAY_IDS, ROUTING_MODEL, buildChatSystemPrompt, buildRouterSystemPrompt, detectDomainRoute, hasModelRouterCredentials, isGuideLocalConversation } from "./chatConfig";
import { generateScopedResponse } from "./chatProviders";
import { synthesizeGuideSpeech } from "./guideSpeech";
import { getCommunityPathway } from "../shared/communityPathways";

const conversationMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1800),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  chat: router({
    respond: publicProcedure
      .input(
        z.object({
          communityId: z.string().min(1).max(64),
          language: z.enum(["English", "हिन्दी", "తెలుగు"]),
          messages: z.array(conversationMessage).min(1).max(12),
        })
      )
      .mutation(async ({ input }) => {
        const activePathway = getCommunityPathway(input.communityId);
        if (!activePathway) {
          throw new Error("Choose a valid community pathway before starting a conversation.");
        }

        const latestUserMessage = [...input.messages].reverse().find((message) => message.role === "user");
        if (!latestUserMessage) {
          throw new Error("Please enter a question before starting a conversation.");
        }

        let targetId = isGuideLocalConversation(latestUserMessage.content)
          ? input.communityId
          : detectDomainRoute(latestUserMessage.content);

        if (!targetId) {
          targetId = input.communityId;

          if (hasModelRouterCredentials()) {
            try {
              const routing = await invokeLLM({
                model: ROUTING_MODEL,
                maxTokens: 110,
                messages: [
                  { role: "system", content: buildRouterSystemPrompt(input.communityId) },
                  { role: "user", content: latestUserMessage.content },
                ],
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "collective_signal_route",
                    strict: true,
                    schema: {
                      type: "object",
                      properties: {
                        targetId: { type: "string", enum: PATHWAY_IDS },
                      },
                      required: ["targetId"],
                      additionalProperties: false,
                    },
                  },
                },
              });

              const routingContent = routing.choices[0]?.message?.content;
              const parsed = typeof routingContent === "string" ? JSON.parse(routingContent) : null;
              if (parsed && typeof parsed.targetId === "string" && PATHWAY_IDS.includes(parsed.targetId)) {
                targetId = parsed.targetId;
              }
            } catch {
              // Vercel does not receive Manus-internal router credentials. Keep
              // an ambiguous request with the guide the visitor explicitly chose.
              targetId = input.communityId;
            }
          }
        }

        const resolvedTargetId = targetId ?? input.communityId;

        if (resolvedTargetId !== input.communityId) {
          const targetPathway = getCommunityPathway(resolvedTargetId) ?? getCommunityPathway("open-field");
          if (!targetPathway) throw new Error("No community pathway is available for this request.");
          return {
            kind: "redirect" as const,
            target: {
              id: targetPathway.id,
              number: targetPathway.number,
              eyebrow: targetPathway.eyebrow,
              title: targetPathway.title,
              greeting: targetPathway.greeting,
            },
            content: `This question is better handled in **${targetPathway.title}**. I’ll take you there so the guidance stays focused.`,
          };
        }

        const response = await generateScopedResponse(input.communityId, buildChatSystemPrompt(input.communityId, input.language), input.messages);

        return { kind: "answer" as const, content: response.content, provider: response.provider };
      }),
    speak: publicProcedure
      .input(
        z.object({
          communityId: z.string().min(1).max(64),
          language: z.enum(["English", "हिन्दी", "తెలుగు"]),
          content: z.string().trim().min(1).max(1_500),
        })
      )
      .mutation(async ({ input }) => {
        if (!getCommunityPathway(input.communityId)) {
          throw new Error("Choose a valid community pathway before using guide voice.");
        }
        return synthesizeGuideSpeech(input.content, input.language);
      }),
  }),
});

export type AppRouter = typeof appRouter;
