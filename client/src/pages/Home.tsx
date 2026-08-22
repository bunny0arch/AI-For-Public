import type { Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { communityPathways, type CommunityPathway } from "@shared/communityPathways";
import {
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  CircleHelp,
  Languages,
  MoveDown,
  SendHorizonal,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

const markUrl = "/manus-storage/collective-mark_962f936b.png";
const heroVideoUrl = "/manus-storage/purple-desert_18154f41.mp4";
const languageOptions = ["English", "हिन्दी", "తెలుగు"] as const;
type ConversationLanguage = (typeof languageOptions)[number];
const AIChatBox = lazy(() => import("@/components/AIChatBox").then((module) => ({ default: module.AIChatBox })));
const signalOrbs = [
  [-44, -27, "#c4f25a", 1.0], [-23, 34, "#ac86ff", 0.72], [36, -30, "#ffd279", 0.82],
  [52, 16, "#78d9ff", 0.64], [12, 46, "#ff9ecf", 0.78], [-57, 18, "#e4ff93", 0.56],
  [18, -53, "#e7b5ff", 0.68], [-10, -12, "#ffe6a6", 0.42], [63, -7, "#a6f4cb", 0.5],
] as const;

function SignalParticles({ visible, merged }: { visible: boolean; merged: boolean }) {
  return (
    <div className={`signal-particle-field ${visible ? "is-visible" : ""} ${merged ? "is-merged" : ""}`} aria-hidden="true">
      <span className="signal-core" />
      {signalOrbs.map(([x, y, color, scale], index) => (
        <span
          className="signal-orb"
          key={`${x}-${y}`}
          style={{
            "--orb-x": x,
            "--orb-y": y,
            "--orb-color": color,
            "--orb-scale": scale,
            "--orb-delay": `${index * -0.37}s`,
          } as CSSProperties}
        >
          <span className="signal-orb-core" />
        </span>
      ))}
    </div>
  );
}

function focusPathways() {
  document.getElementById("pathways")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [selectedPathway, setSelectedPathway] = useState<CommunityPathway | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState<ConversationLanguage>("English");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [signalVisible, setSignalVisible] = useState(false);
  const [signalPulse, setSignalPulse] = useState(false);
  const siteRef = useRef<HTMLElement>(null);
  const signalPulseTimer = useRef<number | null>(null);
  const dialogRef = useRef<HTMLElement>(null);

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
    if (selectedPathway) {
      const timer = window.setTimeout(() => dialogRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [selectedPathway]);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const updatePointer = () => {
      siteRef.current?.style.setProperty("--signal-x", `${pointerX}px`);
      siteRef.current?.style.setProperty("--signal-y", `${pointerY}px`);
      frame = 0;
    };
    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      setSignalVisible(true);
      if (!frame) frame = window.requestAnimationFrame(updatePointer);
    };
    const onLeave = () => setSignalVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => () => {
    if (signalPulseTimer.current) window.clearTimeout(signalPulseTimer.current);
  }, []);

  function pulseSignal() {
    setSignalPulse(true);
    if (signalPulseTimer.current) window.clearTimeout(signalPulseTimer.current);
    signalPulseTimer.current = window.setTimeout(() => setSignalPulse(false), 620);
  }

  function openPathway(pathway: CommunityPathway) {
    chatMutation.reset();
    pulseSignal();
    setSelectedPathway(pathway);
    setMessages([{ role: "assistant", content: pathway.greeting }]);
  }

  function closePathway() {
    if (!chatMutation.isPending) {
      setSelectedPathway(null);
      setSignalPulse(false);
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

  return (
    <main
      className={`site-shell ${selectedPathway || signalPulse ? "signal-is-merged" : ""}`}
      ref={siteRef}
      onPointerDown={() => { if (!selectedPathway) pulseSignal(); }}
    >
      <SignalParticles visible={signalVisible} merged={Boolean(selectedPathway) || signalPulse} />
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
          <div className="language-switcher">
            <button className="language-control" type="button" onClick={() => setLanguageMenuOpen((open) => !open)} aria-expanded={languageMenuOpen} aria-controls="language-menu">
              <Languages size={15} strokeWidth={1.7} />
              <span>{language}</span>
            </button>
            <div className={`language-menu ${languageMenuOpen ? "is-open" : ""}`} id="language-menu" role="menu" aria-label="Choose conversation language">
              {languageOptions.map((option) => (
                <button key={option} type="button" role="menuitem" onClick={() => selectLanguage(option)} className={language === option ? "is-selected" : ""}>
                  {option}
                </button>
              ))}
            </div>
          </div>
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
        <div className="conversation-layer" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePathway();
        }}>
          <section className="conversation-dock" ref={dialogRef} role="dialog" aria-modal="true" aria-label={dialogLabel} tabIndex={-1}>
            <div className="dock-header">
              <div>
                <span className="dock-eyebrow">{selectedPathway.number} / {selectedPathway.eyebrow}</span>
                <h2>{selectedPathway.title}</h2>
              </div>
              <button className="dock-close" type="button" onClick={closePathway} disabled={chatMutation.isPending} aria-label="Close conversation">
                <X size={19} strokeWidth={1.55} />
              </button>
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
