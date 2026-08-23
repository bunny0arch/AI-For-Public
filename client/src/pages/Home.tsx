import type { Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { communityPathways, type CommunityPathway } from "@shared/communityPathways";
import {
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  CircleHelp,
  Download,
  Languages,
  MoveDown,
  SendHorizonal,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

const markUrl = "/manus-storage/collective-mark_962f936b.png";
const heroVideoUrl = "/manus-storage/glass-flower_89bde4e6.mp4";
const languageOptions = ["English", "हिन्दी", "తెలుగు"] as const;
type ConversationLanguage = (typeof languageOptions)[number];
const AIChatBox = lazy(() => import("@/components/AIChatBox").then((module) => ({ default: module.AIChatBox })));

function CursorSphere({ visible }: { visible: boolean }) {
  return <span className={`cursor-sphere ${visible ? "is-visible" : ""}`} aria-hidden="true" />;
}

function focusPathways() {
  document.getElementById("pathways")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [selectedPathway, setSelectedPathway] = useState<CommunityPathway | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState<ConversationLanguage>("English");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [isConversationClosing, setIsConversationClosing] = useState(false);
  const siteRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const chatMutation = trpc.chat.respond.useMutation({
    onSuccess: (result) => {
      if (result.kind === "redirect") {
        const destination = communityPathways.find((pathway) => pathway.id === result.target.id) ?? communityPathways[8];
        setSelectedPathway(destination);
        setMessages([
          { role: "assistant", content: result.content },
          { role: "assistant", content: destination.greeting },
        ]);
        return;
      }
      setMessages((current) => [...current, { role: "assistant", content: result.content }]);
    },
    onError: () => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I’m unable to prepare a response right now. Please try again in a moment, or start with one of the suggested questions.",
        },
      ]);
      toast.error("The conversation is taking longer than expected. Please try again.");
    },
  });

  const dialogLabel = useMemo(
    () => (selectedPathway ? `${selectedPathway.title} conversation` : "Community conversation"),
    [selectedPathway]
  );

  useEffect(() => {
    if (selectedPathway && !isConversationClosing) {
      const timer = window.setTimeout(() => dialogRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [selectedPathway, isConversationClosing]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const updatePointer = () => {
      siteRef.current?.style.setProperty("--cursor-x", `${pointerX}px`);
      siteRef.current?.style.setProperty("--cursor-y", `${pointerY}px`);
      frame = 0;
    };
    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      setCursorVisible(true);
      if (!frame) frame = window.requestAnimationFrame(updatePointer);
    };
    const onLeave = () => setCursorVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function openPathway(pathway: CommunityPathway) {
    chatMutation.reset();
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setIsConversationClosing(false);
    setLanguageMenuOpen(false);
    setSelectedPathway(pathway);
    setMessages([{ role: "assistant", content: pathway.greeting }]);
  }

  function closePathway() {
    if (!chatMutation.isPending) {
      setIsConversationClosing(true);
      closeTimerRef.current = window.setTimeout(() => {
        setSelectedPathway(null);
        setIsConversationClosing(false);
      }, 260);
    }
  }

  function sendMessage(content: string) {
    if (!selectedPathway || chatMutation.isPending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    const conversationMessages = nextMessages.filter(
      (message): message is { role: "user" | "assistant"; content: string } => message.role !== "system"
    );
    setMessages(nextMessages);
    chatMutation.mutate({
      communityId: selectedPathway.id,
      language,
      messages: conversationMessages,
    });
  }

  function selectLanguage(nextLanguage: ConversationLanguage) {
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
    toast.success(`Conversation language set to ${nextLanguage}.`);
  }

  function downloadConversation() {
    if (!selectedPathway) return;

    const transcript = [
      "Collective Signal conversation",
      `Pathway: ${selectedPathway.title}`,
      `Scope: ${selectedPathway.scope}`,
      `Language preference: ${language}`,
      `Downloaded: ${new Date().toLocaleString()}`,
      "",
      ...messages.map((message) => `${message.role === "user" ? "You" : "Collective Signal"}: ${message.content}`),
    ].join("\n\n");
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedPathway.id}-conversation-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Conversation downloaded to your device.");
  }

  return (
    <main className={`site-shell ${selectedPathway && !isConversationClosing ? "is-conversation-active" : ""}`} ref={siteRef}>
      <CursorSphere visible={cursorVisible} />
      <section className="hero-shell" aria-labelledby="hero-title">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/manus-storage/field-reference_86704408.jpg"
          aria-hidden="true"
        >
          <source src={heroVideoUrl} type="video/mp4" />
        </video>
        <div className="hero-veil" aria-hidden="true" />
        <header className="masthead">
          <a className="brand-lockup" href="#top" aria-label="Collective Signal home">
            <img src={markUrl} alt="" className="brand-mark" />
            <span>Collective Signal</span>
          </a>
          <nav className="masthead-nav" aria-label="Main navigation">
            <a href="#mission">Mission</a>
            <a href="#pathways">Pathways</a>
            <button type="button" onClick={focusPathways}>Start a conversation</button>
          </nav>
        </header>

        <div className="hero-content" id="top">
          <div className="hero-intro animation-rise animation-delay-1">
            <span className="eyebrow">An AI for public good initiative</span>
            <span className="intro-rule" />
            <span>India · field-tested questions</span>
          </div>
          <h1 id="hero-title" className="hero-title animation-rise animation-delay-2">
            A clearer next step<br />
            <em>where it matters.</em>
          </h1>
          <div className="hero-bottom animation-rise animation-delay-3">
            <p>
              Practical guidance for people whose daily decisions hold livelihoods,
              safety and futures in balance.
            </p>
            <button className="hero-action" type="button" onClick={focusPathways}>
              <span>Find your pathway</span>
              <ArrowDownRight size={18} strokeWidth={1.6} />
            </button>
          </div>
        </div>

        <aside className="hero-signal-index animation-rise animation-delay-3" aria-label="Immediate community conversation access">
          <div className="hero-index-heading">
            <span>Signal index</span>
            <span>09 pathways</span>
          </div>
          <nav className="hero-index-list" aria-label="Open a community conversation">
            {communityPathways.map((pathway) => (
              <button
                key={pathway.id}
                type="button"
                className="hero-index-item"
                onClick={() => openPathway(pathway)}
                aria-label={`Open ${pathway.title} conversation`}
              >
                <span className="hero-index-number">{pathway.number}</span>
                <span className="hero-index-title">{pathway.title}</span>
                <ArrowRight size={14} strokeWidth={1.6} />
              </button>
            ))}
          </nav>
        </aside>

        <button className="signal-dial animation-rise animation-delay-4" type="button" onClick={focusPathways} aria-label="Explore nine community pathways">
          <span className="dial-ring" />
          <span className="dial-count">09</span>
          <span className="dial-label">ways in</span>
          <span className="dial-arrow"><MoveDown size={18} strokeWidth={1.5} /></span>
        </button>

        <div className="hero-footnote">
          <span>Low-bandwidth mindful</span>
          <span className="footnote-dot" />
          <span>Plain-language first</span>
          <span className="footnote-dot" />
          <span>Community before technology</span>
        </div>
      </section>

      <section className="mission-section" id="mission" aria-labelledby="mission-title">
        <div className="section-marker">01 / The premise</div>
        <div className="mission-copy">
          <p className="section-kicker">Not more AI. More useful AI.</p>
          <h2 id="mission-title">Intelligence becomes public when it is understandable, reachable and answerable to the people using it.</h2>
        </div>
        <div className="mission-aside">
          <AudioLines size={20} strokeWidth={1.45} />
          <p>Begin with a question from the field. Leave with a next action you can verify.</p>
        </div>
      </section>

      <section className="pathways-section" id="pathways" aria-labelledby="pathways-title">
        <div className="pathways-heading">
          <div>
            <span className="section-marker">02 / The signal index</span>
            <h2 id="pathways-title">Choose the decision<br /><em>in front of you.</em></h2>
          </div>
          <p>
            Nine focused entry points for better questions, clearer context and practical next moves.
          </p>
        </div>

        <div className="community-grid" role="list" aria-label="Community AI pathways">
          {communityPathways.map((pathway, index) => (
            <article
              className={`pathway-panel panel-${pathway.size}`}
              key={pathway.id}
              role="listitem"
              data-pathway-index={index}
              style={{ "--panel-index": index } as CSSProperties}
            >
              {pathway.image && (
                <img src={pathway.image} alt="" loading="lazy" className="panel-image" />
              )}
              <div className="panel-scrim" aria-hidden="true" />
              <button type="button" className="panel-button" onClick={() => openPathway(pathway)} aria-label={`Open ${pathway.title} conversation`}>
                <div className="panel-topline">
                  <span className="panel-number">{pathway.number}</span>
                  <span className="panel-eyebrow">{pathway.eyebrow}</span>
                  <ArrowRight className="panel-arrow" size={18} strokeWidth={1.5} />
                </div>
                <div className="panel-body">
                  <h3>{pathway.title}</h3>
                  <p><span className="panel-purpose">{pathway.scope}</span>{pathway.summary}</p>
                </div>
                <div className="panel-footer">
                  <span>Open conversation</span>
                  <span className="panel-signal" />
                </div>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="principle-section" aria-labelledby="principle-title">
        <div className="principle-image-wrap">
          <img src="/manus-storage/field-reference_86704408.jpg" alt="Farm work at blue hour" loading="lazy" />
        </div>
        <div className="principle-copy">
          <span className="section-marker">03 / A working principle</span>
          <h2 id="principle-title">Useful first. <em>Always.</em></h2>
          <p>
            Collective Signal is designed for context: local language, limited connectivity,
            varied ability and the real cost of being wrong. Every conversation is a place to start—not a substitute for local knowledge or official guidance.
          </p>
          <button type="button" className="text-link" onClick={() => openPathway(communityPathways[8])}>
            Bring an unmet need <ArrowRight size={16} strokeWidth={1.7} />
          </button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <img src={markUrl} alt="" className="footer-mark" />
          <span>Collective Signal</span>
        </div>
        <p>Small questions. More agency. Public good.</p>
        <button type="button" onClick={focusPathways}>Return to pathways <ArrowRight size={16} strokeWidth={1.7} /></button>
      </footer>

      {selectedPathway && (
        <div className={`conversation-layer ${isConversationClosing ? "is-closing" : ""}`} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePathway();
        }}>
          <section className="conversation-dock" ref={dialogRef} role="dialog" aria-modal="true" aria-label={dialogLabel} tabIndex={-1}>
            <div className="dock-header">
              <div>
                <span className="dock-eyebrow">{selectedPathway.number} / {selectedPathway.eyebrow}</span>
                <h2>{selectedPathway.title}</h2>
              </div>
              <div className="dock-actions">
                <div className="language-switcher dock-language-switcher">
                  <button
                    className="dock-language-control"
                    type="button"
                    onClick={() => setLanguageMenuOpen((open) => !open)}
                    aria-expanded={languageMenuOpen}
                    aria-controls="chat-language-menu"
                    aria-label={`Conversation language: ${language}`}
                  >
                    <Languages size={15} strokeWidth={1.7} />
                    <span>{language}</span>
                  </button>
                  <div className={`language-menu dock-language-menu ${languageMenuOpen ? "is-open" : ""}`} id="chat-language-menu" role="menu" aria-label="Choose conversation language">
                    {languageOptions.map((option) => (
                      <button key={option} type="button" role="menuitem" onClick={() => selectLanguage(option)} className={language === option ? "is-selected" : ""}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="dock-download" type="button" onClick={downloadConversation} aria-label="Download conversation">
                  <Download size={16} strokeWidth={1.65} />
                  <span>Download</span>
                </button>
                <button className="dock-close" type="button" onClick={closePathway} disabled={chatMutation.isPending} aria-label="Close conversation">
                  <X size={19} strokeWidth={1.55} />
                </button>
              </div>
            </div>
            <div className="dock-note">
              <CircleHelp size={16} strokeWidth={1.5} />
              <span>For grounded, local decisions. Verify time-sensitive or urgent guidance with trusted sources.</span>
            </div>
            <Suspense fallback={<div className="chat-loading" role="status">Opening your conversation…</div>}>
              <AIChatBox
                messages={messages}
                onSendMessage={sendMessage}
                isLoading={chatMutation.isPending}
                height="min(52vh, 480px)"
                placeholder="Ask your question…"
                suggestedPrompts={selectedPathway.starterPrompts}
                emptyStateMessage="Start with a practical question"
                className="signal-chatbox"
              />
            </Suspense>
            <div className="dock-bottom-note"><SendHorizonal size={14} strokeWidth={1.6} /> Ask in your own words. Short answers are welcome.</div>
          </section>
        </div>
      )}
    </main>
  );
}
