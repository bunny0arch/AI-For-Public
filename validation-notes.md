# Live Validation Notes

The revised pathway area now reads as an offset, numbered signal index rather than a uniform gallery. The farmer entry is visually available in the live preview and the two replacement assets are currently in their expected generation state, rather than permanently failed. The next validation pass will confirm the conversation dock after image generation finishes and exercise three scoped-routing cases: a farming question, a clearly fisherman-specific question from the farmer dock, and an unclassified request that should go to the open-field pathway.

The browser’s first interaction attempts scrolled to the farmer entry without surfacing the dock in the extracted accessibility tree. The production component has a direct button trigger and will receive a DOM-level interaction check after the latest build settles; this is being treated as a validation item rather than a visual conclusion.

The DOM-triggered validation successfully mounted the **AI for Farmers** dock with its farmer-specific greeting, scope note, close control, and accessible question field. The remaining behavior check is now limited to confirming the model-backed scope route outcomes.

The first in-scope farm question was incorrectly classified as an open-field request by the lightweight router model. The interaction confirms the fallback itself works, but it also shows that scope protection must add deterministic domain cues before using model classification. The next revision will force strong agricultural signals—such as tomato, leaves, crop, soil and harvest—to the farmer assistant, while still allowing clear cross-domain wording to route users to the appropriate designated panel.

After adding the deterministic cues and passing the updated unit suite, the live farmer dock was reset successfully and is ready for the corrected in-scope request check.

The corrected farm request remains inside the **AI for Farmers** dock after submission, which confirms the deterministic cue guard prevents the earlier premature open-field redirect. The response is still in its loading state at this observation point; the next check will wait for the generated farming guidance and then test an explicitly fishing-related cross-pathway redirect.

The endpoint completed with a server-side response-shape fallback rather than a routing failure. The model helper permits either a string or a structured text-part array; the route now normalizes both shapes, with dedicated unit coverage, before deciding whether an assistant response is empty.

The live conversation was reset after the normalization update, and the tomato request was resubmitted inside the farmer dock. The next observation will determine whether the normalized model output is now rendered correctly.

The model still returned an empty response after normalization. The discovered cause is a token-parameter mismatch: the current chat writer used a GPT-family model while the project helper forwards `max_tokens`; the fast Claude Haiku model accepts that helper contract directly. The response writer has been switched to Claude Haiku, while the low-cost routing classifier remains unchanged.

The response layer has now been replaced by a Gemini primary with a verified OpenRouter fallback. Both provider credentials passed lightweight health checks and the full TypeScript and test suite pass. A fresh live preview loaded successfully and the farmer conversation dock has been opened for response-path validation.

The in-scope tomato request has been accepted within the farmer dock under the new provider layer. The next check will confirm the completed response and reveal whether the Gemini primary or resilient fallback handled the request.

The Gemini-backed farmer conversation completed in the live preview with a scoped agricultural response. A fresh independent page load also renders the language trigger as a visible functional control in the masthead; the next pass will exercise the menu’s selector motion and a compact mobile viewport.

The masthead language control opens a compact animated menu with English, हिन्दी, and తెలుగు choices. Selecting हिन्दी visibly closes the menu, updates the trigger label, and confirms the changed chat preference through an in-product success message.

The farmer conversation has been reopened under the selected Hindi preference. The next live interaction will submit a clearly fishing-specific request to verify that the deterministic boundary guard redirects into the dedicated fishermen assistant instead of answering from the farmer scope.

The fishing-specific request was correctly redirected out of the farmer assistant and into **AI for Fishermen**. The dock title, pathway number, explanatory redirect message, and fishermen-specific greeting all updated in the live interface, confirming that a clear cross-domain request cannot drift into the wrong assistant.

The preview was reset cleanly and the farmer conversation was reopened to test the final routing branch: a community question that does not belong to any of the first eight designated domains.

The first open-field test exposed a routing edge case: the phrase “after school” caused a community-space question to drift into Rural Education & Skills. The deterministic boundary guard now prioritizes explicit neighbourhood and shared-community-space cues ahead of educational cues, with a regression test for the exact request.

The regression check now passes in the live preview: the shared-neighbourhood-space question immediately redirects from AI for Farmers to **09 / Your community, your challenge**, where the open-field greeting is shown. The three critical paths are now evidenced in the interface: an in-scope farmer answer, a farmers-to-fishermen redirect, and a farmers-to-open-field redirect.

After the initial-bundle optimization, the landing page loaded cleanly and a farmer pathway was opened to invoke the deferred chat module. The next interaction will verify that the on-demand conversation renderer is ready without affecting the first-load experience.

The deferred conversation renderer resolved successfully after opening the farmer pathway, presenting the scoped greeting and usable question field. The browser console contains no client-side errors after the optimized entry sequence. The production build also completes successfully with the rich chat renderer isolated in its own on-demand chunk, rather than loading on initial page view.

The final 375px render retains the intended editorial hierarchy and turns the signal index into a vertical sequence of large, reachable pathway bars. A compact-viewport interaction attempt correctly brought the farmer entry into view; the shared conversation event will be confirmed once more through its direct accessible control before finalizing the mobile checklist.

The farmer pathway’s accessible control was confirmed to mount the conversation dock and its usable text input after the responsive verification. The post-restart development log shows a clean current server startup with OAuth initialization and no missing-module entry. The earlier dotenv message was historical, from the interrupted full-stack upgrade before dependency installation.

Explicit performance and accessibility evidence is now recorded in code: the hero video uses `preload="metadata"` with a still-image poster, panel and editorial images are lazy-loaded, and the reduced-motion media query hides the video and uses the hero still as the fallback. In the connected Playwright session at an actual 375 × 812 viewport, the farmer pathway opened, accepted a crop-observation question, and rendered a response with zero console errors. A live response initially included text-only disease speculation, so a deterministic server-side farming guard was added. The final true-mobile response correctly states that text alone cannot confirm the cause, requests visible observations and a clear photo, and directs the visitor to a local agricultural extension professional; it contains no disease-name speculation.

The final runtime reduced-motion check was executed in the same connected 375 × 812 browser session. The browser reports the reduced-motion preference as active, the hero video’s computed display as `none`, and the hero background as the field-reference still. The runtime result also confirms that the hero video retains the matching poster URL and `metadata` preload setting. This closes the media-fallback validation with both source-code and browser-runtime evidence.

The immediate hero Signal Index now displays all nine scoped pathways on desktop without changing the editorial composition; at 375 × 812 it becomes a touch-scroll rail rather than a second dashboard. The desktop viewport check opened Farmers directly from that rail, mounted the conversation dock at the left edge (22px), muted the original hero context and removed its pointer interaction, then restored the context to full opacity after closing. The same open/close behavior was verified in the compact layout, while the index stayed available as orientation.

The final control audit found exactly nine hero-index buttons. Under `prefers-reduced-motion`, a Disaster Resilience chat opened with the hero context immediately hidden, the white cursor sphere suppressed, and the original context restored immediately on close. TypeScript checks, all 11 unit tests, and the production build complete successfully after the focused-takeover change; the build retains the existing non-blocking chunk-size advisory.

Exhaustive control coverage now confirms that all nine hero Signal Index controls open the matching title on both desktop and compact viewports. The compact check deliberately scrolled each item into the horizontal rail before activation, proving access through the complete mobile control sequence rather than only its initially visible items. Every result matched its expected pathway title: Farmers, Fishermen, Artisans, Micro-Entrepreneurs, Accessible Public Services, Persons with Disabilities, Rural Education & Skills, Disaster Resilience, and the open-field community pathway.

The supplied glass-flower video has replaced the desert media in the hero. Desktop inspection confirms that the flower occupies the central negative space without reducing contrast for the left editorial title or right Signal Index. At 375 × 812, the flower remains framed behind the editorial copy, with the call-to-action and horizontal pathway rail still legible and reachable.

The browser runtime confirms that the live `<video>` source is `/manus-storage/glass-flower_89bde4e6.mp4`, has reached ready state 4, retains `preload="metadata"`, and preserves the field-reference poster. With reduced motion enabled, the video is hidden and the hero uses the existing still-image fallback. TypeScript validation and all 11 unit tests pass after the media replacement.

The chartreuse system has been visually replaced with royal navy and controlled gold. On desktop, navy now establishes the field for the hero, pathway panels, conversational dock, and footer, while gold carries labels, numbering, and fine borders. Royal red is restricted to decisive hover and submission states, plus the small hero footnote markers. At 375 × 812, the navy call-to-action, gold title emphasis, and gold-numbered pathway rail retain clear separation against the glass-flower hero.

The compact runtime check closes the final video-media gap: at 375 × 812 the glass-flower source and field-reference poster are both present, and reduced motion hides the video while keeping the still fallback. The palette audit confirms the primary action resolves to royal blue `rgb(22, 75, 140)` with a gold border, hero-index numerals resolve to gold `rgb(224, 201, 142)`, and the settled pathway hover resolves to restrained royal red `rgb(132, 31, 62)`. TypeScript and all 11 unit tests pass after the palette refinement.
