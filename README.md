# Collective Signal — AI for Public Good

**Collective Signal** is a cinematic, community-first landing page that routes people to one of nine tightly scoped AI conversations. It is designed around practical next steps for livelihoods, access, learning, climate readiness, and community needs—rather than a single broad, unbounded chatbot.

> **Current public domain:** `https://aipublicgood-savd6qsg.manus.space`

The product uses a royal-navy editorial visual system with restrained gold and red accents, documentary pathway imagery, a looping glass-flower hero, and an accessible focused-chat experience. The final card design intentionally **does not display guide figures**; pathway imagery and clear copy carry the visual hierarchy, while the named AI guides remain present in chat.

## Contents

- [Product experience](#product-experience)
- [Nine community pathways](#nine-community-pathways)
- [Conversation behavior and safety](#conversation-behavior-and-safety)
- [Guide voice](#guide-voice)
- [Interface and accessibility](#interface-and-accessibility)
- [Technical architecture](#technical-architecture)
- [API surface](#api-surface)
- [Media and visual assets](#media-and-visual-assets)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Validation and quality status](#validation-and-quality-status)
- [Project conventions](#project-conventions)

## Product experience

The home page is built as an editorial entry point, not a dashboard. A quiet looping glass-flower video anchors the hero while the **Signal Index** makes all nine conversations reachable immediately. Selecting a pathway opens its focused conversation as a left-side takeover; the hero context fades back in when the conversation closes.

| Experience area | Implemented behavior |
|---|---|
| Hero | Muted, looping glass-flower video with a deliberately reduced **0.62×** playback speed. It continues looping while active. |
| Reduced motion | The moving hero media is suppressed for users who prefer reduced motion, leaving a still editorial fallback. |
| Signal Index | A right-side, numbered 01–09 immediate-access index opens the matching scoped conversation without first scrolling through the page. |
| Pathway deck | Nine cards form an ordered sticky stack: later cards layer above earlier cards, then release in reverse order when scrolling back. The last card has a dedicated runway so it settles before the following content begins. |
| Final visual treatment | Documentary panel imagery, pathway metadata, and readable dark copy fields remain. All nine guide-figure overlays were removed by design. |
| Decorative system | Restrained navy, gold, and red signal sculptures occupy outer whitespace only; they do not overlap text or cards and are hidden on compact layouts. |
| Pointer detail | Fine-pointer users see a small white sphere centered on the pointer. It makes a brief pop on click and is hidden over the chat dock and in reduced-motion mode. |

## Nine community pathways

Each pathway has a named AI guide, a constrained subject area, starter prompts, a guide-specific greeting, and a distinct documentary panel image. The guide name is retained in the card metadata and chat header even though no guide portraits are rendered in the final card design.

| No. | Pathway | Named AI guide | Scope |
|---:|---|---|---|
| 01 | **AI for Farmers** | Asha — Farm guide | Crop decisions, visible crop observations, weather-aware planning, market context, and farmer-relevant scheme or document questions. |
| 02 | **AI for Fishermen** | Vikram — Coast guide | Sea preparation, boat safety, fishing-zone decisions, catch planning, and fishing-market context. |
| 03 | **AI for Artisans** | Meera — Craft guide | Traditional craft, catalogues, pricing, market discovery, demand signals, and producer-customer connection. |
| 04 | **AI for Micro-Entrepreneurs** | Farah — Street economy guide | Street vending, demand, inventory, basic financial decisions, formal-market access, and business support. |
| 05 | **Accessible Public Services** | Nandini — Service guide | Welfare schemes, service navigation, documents, eligibility questions, and application preparation. |
| 06 | **AI for Persons with Disabilities** | Kiran — Access guide | Accessibility, assistive communication, inclusive learning, navigation, disability-inclusive employment, and autonomy. |
| 07 | **Rural Education & Skills** | Ravi — Learning guide | Multilingual learning support, study help, careers, skills, and resource-aware learning paths. |
| 08 | **Disaster Resilience** | Leela — Resilience guide | Flood, drought, extreme-weather readiness, response planning, household/community preparation, and resilience. |
| 09 | **Your community, your challenge** | Saira — Community guide | Needs outside the first eight pathways, early-stage public-good problem framing, underserved groups, and measurable impact ideas. |

## Conversation behavior and safety

### Scoped routing

Collective Signal intentionally avoids a general-purpose assistant. Every user message is evaluated against the active pathway before an answer is produced.

1. **Deterministic cue routing** catches clear cross-pathway topics such as crop, boat, welfare, disability, study, or flood questions.
2. If no clear cue applies, a compact JSON-schema routing request classifies the latest message against the nine valid pathway IDs.
3. A question that belongs to another pathway triggers a short redirect and opens that pathway with its guide greeting.
4. Ambiguous, unrelated, or novel needs default to **Pathway 09 — Your community, your challenge**.
5. Only a message that belongs to the active pathway is sent to the scoped response provider.

### Named AI guide behavior

Each conversation speaks through the selected guide’s tone and role. The system prompt requires a natural first-person introduction such as, “I’m Asha, your AI farm guide,” while making the identity clear:

> The guide is an **AI persona**, not a real person. It must not claim personal lived experience, ownership, visits, local relationships, or direct observation.

### Practical guardrails

The response policy is designed for low-risk, local, and verifiable guidance.

| Guardrail | Implemented behavior |
|---|---|
| Scope integrity | The active guide does not answer outside its assigned scope; it redirects to the appropriate pathway or to Pathway 09. |
| Uncertainty | The assistant does not invent real-time weather, sea conditions, market prices, benefits, eligibility, contacts, or official outcomes. |
| Farming safety | Text-only crop symptoms cannot produce a disease diagnosis or specific chemical recommendation. The response requests observable details or a clear image and recommends local extension or official confirmation. |
| High-stakes situations | The assistant directs users to official sources, trained professionals, local authorities, emergency services, or trusted local organizations when appropriate. |
| Inclusive communication | Prompts require plain language, mobile-aware brevity, respect for local languages, disability access, low connectivity, and low digital literacy. |
| Conversation bounds | A request contains up to 12 messages; individual user messages are limited to 1,800 characters and guide speech input to 1,500 characters. |

### Chat usability

- **Starter prompts** provide a practical, pathway-specific way to begin.
- The language selector lives inside the conversation dock, not the hero.
- The selected language options are **English**, **हिन्दी**, and **తెలుగు**.
- A **Download** control exports the local conversation history as a text file.
- A close control returns users to the landing experience without losing the page’s visual context.
- Loading, provider-error, playback-error, and retryable feedback states are surfaced in the interface.

## Guide voice

Guide voice is an optional, server-side ElevenLabs integration. The active dock has a title-adjacent **Listen / Stop** control that reads the most recent assistant message through a persistent audio element.

| Capability | Implementation |
|---|---|
| Provider | ElevenLabs Text-to-Speech, called only from the server. |
| Voice model | `eleven_multilingual_v2`. |
| Voice selection | A clear multilingual Sarah voice configuration with restrained expressive settings. |
| Languages | English and Hindi send explicit provider language metadata; Telugu omits unsupported metadata and relies on multilingual script detection. |
| Text preparation | Lightweight Markdown and links are cleaned before narration; spoken content is capped at 1,500 characters. |
| Secret handling | `ELEVENLABS_API_KEY` remains server-only. It is never sent to or embedded in the client. |
| Playback controls | Listen starts the latest guide response; Stop pauses the persistent audio. Failed synthesis or playback returns a retryable toast and restores the control. |

The application does **not** use the browser’s generic `SpeechSynthesis` voice for guide narration.

## Interface and accessibility

The interface was designed for public-facing use across desktop and compact layouts.

| Area | Implemented behavior |
|---|---|
| Responsive layout | Desktop uses the hero index and left-side chat takeover. Compact layouts use a simplified rail and bottom-sheet-style conversation treatment. |
| Motion preferences | Video, pointer sphere, decorative motion, and non-essential card motion respect `prefers-reduced-motion`. |
| Keyboard and focus | The chat dock is a modal dialog with a visible close control and focusable interaction controls. |
| Labels | Signal-index buttons, open-card actions, language controls, transcript download, close actions, and voice controls use accessible labels. |
| Contrast and hierarchy | Cards use a dark copy field over their documentary image with deliberate scrim treatment; the final figure-free review confirmed readable copy and visual balance. |
| Cursor behavior | The white pointer sphere is suppressed in the conversation dock so it cannot obscure chat text. |
| Mobile-first clarity | Small-screen layouts reduce nonessential decoration and retain direct access to pathways and chat controls. |

## Technical architecture

The project uses a React/Vite client and an Express/tRPC server in a single TypeScript codebase.

```text
Browser
  └─ React 19 + TypeScript + Tailwind CSS 4
       ├─ Home page, signal index, pathway stack, chat dock
       ├─ React Query + tRPC client
       └─ Persistent HTML audio element for guide playback

Express server
  └─ tRPC router
       ├─ chat.respond — routing and scoped answer generation
       ├─ chat.speak — server-side ElevenLabs synthesis
       └─ Auth/system routes supplied by the project template

AI providers
  ├─ Gemini 2.5 Flash — primary scoped response provider
  ├─ OpenRouter / Cohere Command R7B — response fallback
  ├─ GPT-5 Nano — compact structured route classifier
  └─ ElevenLabs — optional multilingual guide narration
```

### Primary directories

| Path | Responsibility |
|---|---|
| `client/src/pages/Home.tsx` | Main editorial page, card stack, Signal Index, chat takeover, transcript export, pointer sphere, and voice-control state. |
| `client/src/index.css` | Royal-navy/red/gold visual system, stack geometry, responsive rules, card treatment, chat styling, reduced-motion behavior, and decorative elements. |
| `shared/communityPathways.ts` | Canonical nine-pathway data: scopes, guides, greetings, prompts, images, and sizes. |
| `shared/speechLanguage.ts` | Supported language options and Hindi/Telugu script inference. |
| `server/chatConfig.ts` | Pathway cue routing, guide prompts, disclosure language, cross-scope policy, and safety constraints. |
| `server/chatProviders.ts` | Gemini-first/OpenRouter-fallback response generation and farming-safety guard. |
| `server/routers.ts` | Public tRPC contracts for scoped chat responses and guide speech. |
| `server/guideSpeech.ts` | Server-only ElevenLabs request preparation and MP3 base64 response handling. |
| `server/*.test.ts` | Unit and configuration coverage for routing, guide speech, provider health, and pathway data. |
| `validation-notes.md` | Chronological product, runtime, visual, voice, accessibility, and asset-validation record. |
| `todo.md` | Historical implementation checklist. Completed items are intentionally retained as delivery history. |

## API surface

Both public procedures are exposed through the project’s tRPC endpoint.

| Procedure | Input | Output | Notes |
|---|---|---|---|
| `chat.respond` | `communityId`, `language`, up to 12 `{ role, content }` messages | Scoped answer with provider name, or a redirect target and greeting | Performs deterministic routing first, structured classifier fallback second, and response-provider fallback last. |
| `chat.speak` | `communityId`, `language`, assistant `content` | Base64-encoded `audio/mpeg` | Validates pathway, cleans speakable text, then calls ElevenLabs server-side. |

## Media and visual assets

- The hero references the managed glass-flower video at `/manus-storage/`; it is not stored in the repository’s public folder.
- Panel images are managed `/manus-storage/` URLs and load directly into the pathway card treatment.
- The final card UI intentionally does not render guide portraits or supplied figure overlays. Some historical portrait references remain in pathway data for project continuity, but the rendered card composition contains **zero** guide-portrait elements.
- Large media assets should be staged outside the repository under `/home/ubuntu/webdev-static-assets/` and uploaded with `manus-upload-file --webdev` before being referenced by their managed path.

## Local development

### Prerequisites

- Node.js 22+
- pnpm 10+
- Access to the required server-side provider environment variables

### Commands

```bash
# Install dependencies
pnpm install

# Start the combined development server
pnpm dev

# Static type check
pnpm check

# Run the Vitest suite
pnpm test

# Build the production client and server bundle
NODE_OPTIONS=--max-old-space-size=512 pnpm build

# Start a production build
pnpm start
```

> The production build currently emits a non-blocking client chunk-size advisory. The site remains buildable and deployable.

## Configuration

Secrets must be managed in the project environment or platform secret manager. Do **not** commit a `.env` file or expose provider keys to the browser.

| Variable | Used by | Required behavior |
|---|---|---|
| `GEMINI_API_KEY` | Primary scoped chat provider | Enables Gemini 2.5 Flash responses. |
| `OPENROUTER_API_KEY` | Scoped chat fallback | Used only when the Gemini provider cannot provide a valid response. |
| `ELEVENLABS_API_KEY` | Guide voice endpoint | Enables server-side Listen/Stop narration. |
| `DATABASE_URL` | Template database infrastructure | Supplied by the full-stack project runtime; conversations are not persisted by the page feature. |
| `JWT_SECRET`, OAuth variables | Template authentication infrastructure | Managed by the runtime; the public landing/chat experience does not require a sign-in flow. |
| `BUILT_IN_FORGE_API_*` | Platform integration infrastructure | Used by the managed project runtime. |

## Validation and quality status

The implementation has been validated iteratively across page interaction, card layering, routing, visual rendering, and voice-control behavior.

| Area | Validated behavior |
|---|---|
| Type safety | `pnpm check` passes after the final figure-free card update. |
| Unit coverage | Chat-routing configuration, guide language/speech preparation, provider-health configuration, guide disclosure, and pathway data are covered by Vitest tests. |
| Production build | `NODE_OPTIONS=--max-old-space-size=512 pnpm build` passes; the remaining chunk-size note is advisory. |
| Scoped routing | All nine guide prompts and cross-pathway redirect behavior were exercised, including a farm-to-coast redirect. |
| Hero video | Verified to loop at the intended 0.62× rate and to suppress under reduced-motion preference. |
| Voice UI | English, Hindi, and Telugu behavior plus controlled failure handling were validated earlier; final figure-removal checks verified the inactive Listen control without requesting a new synthesis. |
| Assets | All panel images were checked for nonzero loaded dimensions. Final figure-free validation confirms zero rendered guide portrait elements. |
| Visual review | Desktop and compact stack behavior, late-pathway readability, Open Field composition, and the final figure-free card balance were reviewed. |

## Project conventions

1. **Keep the nine scopes strict.** Do not broaden a pathway simply to answer a message; redirect it or use Pathway 09.
2. **Keep guide identity transparent.** Named guides are AI personas, never real people claiming lived experience.
3. **Never expose provider keys.** Chat and voice provider calls belong on the server.
4. **Preserve the user-selected design direction.** The current visual system is royal navy with restrained red and gold—not a generic blue SaaS template or an older chartreuse recommendation.
5. **Respect motion preferences.** Any new non-essential animation must have a reduced-motion fallback.
6. **Do not reintroduce guide figures without an explicit design decision.** The final user request removed all nine figure overlays from the cards.
7. **Store media outside the repo.** Reference managed `/manus-storage/` paths rather than adding large image or video files under `client/public`.
8. **Keep controls functional.** New UI controls need a complete success path, failure state, accessible label, and validation coverage where appropriate.

## License

This repository is currently marked **MIT** in `package.json`.
