import type { Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { communityPathways, type CommunityPathway } from "@shared/communityPathways";
import { conversationLanguages, inferSpeechLanguage, type ConversationLanguage } from "@shared/speechLanguage";
import {
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  CircleHelp,
  Download,
  Languages,
  MoveDown,
  Pin,
  PinOff,
  Play,
  SendHorizonal,
  Square,
  Undo2,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

const publicMediaBase = "https://github.com/bunny0arch/AI-For-Public/releases/download/public-media-v1/";
const markUrl = `${publicMediaBase}collective-mark.png`;
const heroVideoUrl = `${publicMediaBase}glass-flower.mp4`;
const fieldReferenceUrl = `${publicMediaBase}field-reference.jpg`;
const AIChatBox = lazy(() => import("@/components/AIChatBox").then((module) => ({ default: module.AIChatBox })));
const REDIRECT_HANDOFF_MS = 250;
const REDIRECT_STATUS_SETTLE_MS = 180;

type RedirectOrigin = {
  pathway: CommunityPathway;
  messages: Message[];
  carriedQuestion: string | null;
};

type HandoffStage = "leaving" | "opening" | null;

function CursorSphere({ visible, popping }: { visible: boolean; popping: boolean }) {
  return <span className={`cursor-sphere ${visible ? "is-visible" : ""} ${popping ? "is-popping" : ""}`} aria-hidden="true" />;
}

function SignalSculpture({ tone, className }: { tone: "navy" | "gold" | "red"; className: string }) {
  return (
    <div className={`signal-sculpture signal-sculpture-${tone} ${className}`} aria-hidden="true">
      <span className="sculpture-top" />
      <span className="sculpture-front" />
      <span className="sculpture-side" />
    </div>
  );
}

function GuideArtFigure({ variant }: { variant: "resilience" | "community" }) {
  if (variant === "resilience") {
    return (
      <svg className="panel-guide-illustration guide-illustration-resilience" viewBox="0 0 240 360" aria-hidden="true">
        <path className="guide-rain guide-rain-a" d="M36 48l-12 28M74 25L62 54M114 42l-10 28M161 20l-8 28M202 52l-12 28" />
        <circle className="guide-sun" cx="188" cy="72" r="28" />
        <path className="guide-cloud" d="M151 83c9-22 42-20 48 1 16 0 24 11 22 22h-79c-7-13-1-23 9-23Z" />
        <path className="guide-leaf" d="M190 129c19-14 35-9 39 3-7 16-24 23-39 20Z" />
        <ellipse className="guide-skin" cx="111" cy="128" rx="29" ry="34" />
        <path className="guide-hair" d="M80 132c-1-29 16-47 36-47 21 0 33 14 33 38-12-12-21-16-33-16-11 0-23 8-36 25Z" />
        <path className="guide-neck" d="M99 153h25v28H99Z" />
        <path className="guide-shawl" d="M69 193c14-22 35-31 55-30 23 1 42 17 51 44l-16 78H55Z" />
        <path className="guide-tunic" d="M89 173c10 12 34 12 45 0 19 8 31 29 35 57l-12 95H63l-4-97c2-29 11-47 30-55Z" />
        <path className="guide-skirt" d="M69 314h91l20 30H53Z" />
        <path className="guide-arm" d="M151 188c28 5 39 27 39 61l-18 4c-3-28-9-39-28-43Z" />
        <path className="guide-notebook" d="M168 223l38 8-8 52-38-8Z" />
        <path className="guide-note-lines" d="m177 240 20 4m-23 10 20 4m-23 10 15 3" />
        <circle className="guide-mark" cx="74" cy="279" r="5" />
        <circle className="guide-mark" cx="91" cy="291" r="4" />
      </svg>
    );
  }

  return (
    <svg className="panel-guide-illustration guide-illustration-community" viewBox="0 0 240 360" aria-hidden="true">
      <path className="guide-radiance" d="M38 80h35M51 53l28 22M46 108l31-18M167 43l-14 31M203 69l-32 13" />
      <ellipse className="guide-skin" cx="115" cy="124" rx="29" ry="35" />
      <path className="guide-hair" d="M82 130c-1-31 17-49 36-49 23 0 37 16 35 43-10-13-24-21-38-20-14 0-23 10-33 26Z" />
      <path className="guide-neck" d="M101 151h26v28h-26Z" />
      <path className="guide-scarf" d="M61 198c13-24 35-36 59-36 29 0 49 18 57 46l-18 88H53Z" />
      <path className="guide-tunic" d="M82 178c11 13 40 14 53 0 20 8 32 30 34 62l-12 84H65l-7-85c2-29 10-51 24-61Z" />
      <path className="guide-arm" d="M70 205c-19 10-27 30-27 58l18 2c2-23 8-35 23-41Z" />
      <path className="guide-map" d="M46 238l75-18 42 17-75 18Z" />
      <path className="guide-map-lines" d="m61 244 19 21m9-30 18 20m8-29 18 20m-61 1 60-14" />
      <circle className="guide-node" cx="65" cy="250" r="5" />
      <circle className="guide-node" cx="104" cy="241" r="5" />
      <circle className="guide-node" cx="142" cy="238" r="5" />
      <path className="guide-speech" d="M166 120c17-15 40-5 40 15 0 10-8 19-18 21l-12 12 2-14c-11-3-18-12-18-22 0-5 2-9 6-12Z" />
      <path className="guide-speech-lines" d="m173 128 19 4m-20 8 16 3" />
      <path className="guide-skirt" d="M64 314h94l20 30H45Z" />
    </svg>
  );
}

function focusPathways() {
  document.getElementById("pathways")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function isInsideConversation(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(".conversation-dock"));
}

function summarizeHandoffContext(source: CommunityPathway, conversation: Message[]): string | null {
  const recentUserTopics = conversation
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content.trim())
    .filter(Boolean);

  if (recentUserTopics.length === 0) return null;
  return `The visitor was previously speaking with ${source.guide.name} in ${source.title}. Relevant request: ${recentUserTopics.join(" / ")}`;
}

function triggerHandoffHaptic() {
  if (typeof window === "undefined") return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const vibrate = (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate;
  if (!reducedMotion && coarsePointer) vibrate?.(12);
}

export default function Home() {
  const [selectedPathway, setSelectedPathway] = useState<CommunityPathway | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState<ConversationLanguage>("English");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPopping, setCursorPopping] = useState(false);
  const [isGuideSpeaking, setIsGuideSpeaking] = useState(false);
  const [isConversationClosing, setIsConversationClosing] = useState(false);
  const [isGuideRedirecting, setIsGuideRedirecting] = useState(false);
  const [redirectDestination, setRedirectDestination] = useState<CommunityPathway | null>(null);
  const [handoffContext, setHandoffContext] = useState<string | null>(null);
  const [redirectOrigin, setRedirectOrigin] = useState<RedirectOrigin | null>(null);
  const [carriedQuestion, setCarriedQuestion] = useState<string | null>(null);
  const [isCarriedQuestionPinned, setIsCarriedQuestionPinned] = useState(false);
  const [handoffStage, setHandoffStage] = useState<HandoffStage>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const siteRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const popTimerRef = useRef<number | null>(null);
  const guideAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastChatRequestRef = useRef<{
    communityId: string;
    language: ConversationLanguage;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  } | null>(null);

  const chatMutation = trpc.chat.respond.useMutation({
    onSuccess: (result) => {
      setChatError(null);
      if (result.kind === "redirect") {
        const destination = communityPathways.find((pathway) => pathway.id === result.target.id) ?? communityPathways[8];
        beginRedirectHandoff(destination, result.content);
        return;
      }
      setMessages((current) => [...current, { role: "assistant", content: result.content }]);
    },
    onError: () => {
      setChatError("We could not prepare a response just now. Retry this question, or choose a more specific pathway.");
      toast.error("That response did not complete. Your question has been kept so you can retry.");
    },
  });

  const speakMutation = trpc.chat.speak.useMutation({
    onSuccess: ({ audioBase64, contentType }) => {
      const audio = guideAudioRef.current;
      if (!audio) return;
      audio.onplay = () => setIsGuideSpeaking(true);
      audio.onpause = () => setIsGuideSpeaking(false);
      audio.onended = () => setIsGuideSpeaking(false);
      audio.onerror = () => {
        setIsGuideSpeaking(false);
        toast.error("Guide voice could not finish playing. Please try again.");
      };
      audio.pause();
      audio.src = `data:${contentType};base64,${audioBase64}`;
      audio.currentTime = 0;
      void audio.play()
        .then(() => window.setTimeout(() => setIsGuideSpeaking(!audio.paused), 100))
        .catch(() => toast.error("Your browser blocked guide voice playback. Try the control again."));
    },
    onError: () => toast.error("Guide voice is unavailable right now. Please try again."),
  });

  const dialogLabel = useMemo(
    () => (selectedPathway ? `${selectedPathway.title} conversation` : "Community conversation"),
    [selectedPathway]
  );
  const shouldRenderConversationLayer = Boolean(selectedPathway || (isGuideRedirecting && redirectDestination));
  const handoffProgress = handoffStage === "opening" ? 0.82 : 0.42;
  const handoffProgressLabel = handoffStage === "opening" ? "Opening the next guide" : "Securing your conversation context";

  useEffect(() => {
    if (selectedPathway && !isConversationClosing) {
      const timer = window.setTimeout(() => dialogRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [selectedPathway, isConversationClosing]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
    guideAudioRef.current?.pause();
  }, []);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    let frame = 0;
    let popFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const updatePointer = () => {
      siteRef.current?.style.setProperty("--cursor-x", `${pointerX}px`);
      siteRef.current?.style.setProperty("--cursor-y", `${pointerY}px`);
      frame = 0;
    };
    const onMove = (event: PointerEvent) => {
      if (isInsideConversation(event.target)) {
        setCursorVisible(false);
        setCursorPopping(false);
        if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
        return;
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      setCursorVisible(true);
      if (!frame) frame = window.requestAnimationFrame(updatePointer);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (isInsideConversation(event.target)) {
        setCursorVisible(false);
        setCursorPopping(false);
        if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
        return;
      }
      setCursorPopping(false);
      if (popFrame) window.cancelAnimationFrame(popFrame);
      if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
      popFrame = window.requestAnimationFrame(() => {
        setCursorPopping(true);
        popFrame = 0;
      });
      popTimerRef.current = window.setTimeout(() => setCursorPopping(false), 230);
    };
    const onLeave = () => setCursorVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
      if (popFrame) window.cancelAnimationFrame(popFrame);
    };
  }, []);

  function openPathway(pathway: CommunityPathway) {
    if (isGuideRedirecting) return;
    chatMutation.reset();
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    setIsConversationClosing(false);
    setLanguageMenuOpen(false);
    setChatError(null);
    setRedirectDestination(null);
    setHandoffContext(null);
    setRedirectOrigin(null);
    setCarriedQuestion(null);
    setIsCarriedQuestionPinned(false);
    setHandoffStage(null);
    setSelectedPathway(pathway);
    setMessages([{ role: "assistant", content: pathway.greeting }]);
  }

  function closePathway() {
    if (!chatMutation.isPending && !isGuideRedirecting) {
      guideAudioRef.current?.pause();
      setIsGuideSpeaking(false);
      setIsConversationClosing(true);
      closeTimerRef.current = window.setTimeout(() => {
        setSelectedPathway(null);
        setIsConversationClosing(false);
        setRedirectDestination(null);
        setHandoffContext(null);
        setRedirectOrigin(null);
        setCarriedQuestion(null);
        setIsCarriedQuestionPinned(false);
        setHandoffStage(null);
      }, 260);
    }
  }

  function beginRedirectHandoff(destination: CommunityPathway, redirectMessage: string) {
    if (isGuideRedirecting) return;

    const origin = selectedPathway;
    const context = origin ? summarizeHandoffContext(origin, messages) : null;
    const nextCarriedQuestion = [...messages].reverse().find((message) => message.role === "user")?.content ?? null;
    if (!origin) return;
    guideAudioRef.current?.pause();
    setIsGuideSpeaking(false);
    setLanguageMenuOpen(false);
    setChatError(null);
    setRedirectDestination(destination);
    setHandoffContext(context);
    setRedirectOrigin({ pathway: origin, messages, carriedQuestion: nextCarriedQuestion });
    setCarriedQuestion(nextCarriedQuestion);
    setIsCarriedQuestionPinned(false);
    setHandoffStage("leaving");
    setIsGuideRedirecting(true);
    triggerHandoffHaptic();

    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = window.setTimeout(() => {
      setSelectedPathway(null);
      window.requestAnimationFrame(() => {
        setHandoffStage("opening");
        setSelectedPathway(destination);
        setMessages([
          ...(nextCarriedQuestion ? [{ role: "user" as const, content: nextCarriedQuestion }] : []),
          { role: "assistant", content: redirectMessage },
          { role: "assistant", content: destination.greeting },
        ]);
        redirectTimerRef.current = window.setTimeout(() => {
          setIsGuideRedirecting(false);
          setHandoffStage(null);
          redirectTimerRef.current = null;
        }, REDIRECT_STATUS_SETTLE_MS);
      });
    }, REDIRECT_HANDOFF_MS);
  }

  function returnToPreviousGuide() {
    if (!redirectOrigin || isGuideRedirecting) return;

    guideAudioRef.current?.pause();
    setIsGuideSpeaking(false);
    setLanguageMenuOpen(false);
    setChatError(null);
    setRedirectDestination(redirectOrigin.pathway);
    setHandoffContext(`Returning to ${redirectOrigin.pathway.guide.name}.`);
    setHandoffStage("leaving");
    setIsGuideRedirecting(true);
    triggerHandoffHaptic();

    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = window.setTimeout(() => {
      setSelectedPathway(null);
      window.requestAnimationFrame(() => {
        setHandoffStage("opening");
        setSelectedPathway(redirectOrigin.pathway);
        setMessages(redirectOrigin.messages);
        setRedirectOrigin(null);
        setCarriedQuestion(null);
        setIsCarriedQuestionPinned(false);
        redirectTimerRef.current = window.setTimeout(() => {
          setIsGuideRedirecting(false);
          setHandoffStage(null);
          redirectTimerRef.current = null;
        }, REDIRECT_STATUS_SETTLE_MS);
      });
    }, REDIRECT_HANDOFF_MS);
  }

  function sendMessage(content: string) {
    if (!selectedPathway || chatMutation.isPending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    const conversationMessages = nextMessages.filter(
      (message): message is { role: "user" | "assistant"; content: string } => message.role !== "system"
    );
    const request = {
      communityId: selectedPathway.id,
      language,
      messages: conversationMessages.slice(-12),
    };
    lastChatRequestRef.current = request;
    setChatError(null);
    setHandoffContext(null);
    setMessages(nextMessages);
    chatMutation.mutate(request);
  }

  function retryLastMessage() {
    const request = lastChatRequestRef.current;
    if (!request || chatMutation.isPending) return;
    setChatError(null);
    chatMutation.mutate(request);
  }

  function selectLanguage(nextLanguage: ConversationLanguage) {
    guideAudioRef.current?.pause();
    setIsGuideSpeaking(false);
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
    toast.success(`Conversation language set to ${nextLanguage}.`);
  }

  function toggleGuideVoice() {
    if (!selectedPathway) return;
    if (isGuideSpeaking) {
      guideAudioRef.current?.pause();
      setIsGuideSpeaking(false);
      return;
    }
    if (speakMutation.isPending) return;

    const latestGuideMessage = [...messages].reverse().find((message) => message.role === "assistant");
    if (!latestGuideMessage) {
      toast.message("Ask a question first, then I can read the guide’s response aloud.");
      return;
    }
    speakMutation.mutate({
      communityId: selectedPathway.id,
      language: inferSpeechLanguage(latestGuideMessage.content, language),
      content: latestGuideMessage.content,
    });
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
    <main className={`site-shell ${(selectedPathway && !isConversationClosing) || isGuideRedirecting ? "is-conversation-active" : ""}`} ref={siteRef}>
      <CursorSphere visible={cursorVisible} popping={cursorPopping} />
      <section className="hero-shell" aria-labelledby="hero-title">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => {
            event.currentTarget.defaultPlaybackRate = 0.62;
            event.currentTarget.playbackRate = 0.62;
          }}
          poster={fieldReferenceUrl}
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
        <SignalSculpture tone="gold" className="mission-sculpture" />
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

        <SignalSculpture tone="navy" className="pathway-sculpture pathway-sculpture-left" />
        <SignalSculpture tone="red" className="pathway-sculpture pathway-sculpture-right" />

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
                  <span className="panel-guide-meta">
                    <span className="panel-eyebrow">{pathway.eyebrow}</span>
                    <span className="panel-guide-name">Guide: {pathway.guide.name}</span>
                  </span>
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
          <img src={fieldReferenceUrl} alt="Farm work at blue hour" loading="lazy" />
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

      {shouldRenderConversationLayer && (
        <div className={`conversation-layer ${isConversationClosing ? "is-closing" : ""} ${isGuideRedirecting ? "is-redirecting" : ""}`} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePathway();
        }}>
          {isGuideRedirecting && redirectDestination && (
            <div className="redirect-status" role="status" aria-live="polite">
              <span>Switching to</span>
              <strong>{redirectDestination.guide.name} · {redirectDestination.title}</strong>
              {handoffContext && <em>Your question is being carried forward.</em>}
              <div
                className="redirect-progress"
                role="progressbar"
                aria-label="Guide handoff progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(handoffProgress * 100)}
                aria-valuetext={handoffProgressLabel}
              >
                <div className="redirect-progress-meta">
                  <span>{handoffStage === "opening" ? "Step 2 of 2" : "Step 1 of 2"}</span>
                  <span>{handoffProgressLabel}</span>
                </div>
                <span className="redirect-progress-track" aria-hidden="true">
                  <span className="redirect-progress-fill" style={{ "--handoff-progress": handoffProgress } as CSSProperties} />
                </span>
              </div>
            </div>
          )}
          {selectedPathway && <section className="conversation-dock" ref={dialogRef} role="dialog" aria-modal="true" aria-busy={isGuideRedirecting} aria-label={dialogLabel} tabIndex={-1}>
            <div className="dock-header">
              <div>
                <span className="dock-eyebrow">{selectedPathway.number} / {selectedPathway.guide.name} · {selectedPathway.guide.role}</span>
                <div className="dock-title-row">
                  <h2>{selectedPathway.title}</h2>
                  <button
                    className="dock-voice"
                    type="button"
                    onClick={toggleGuideVoice}
                    disabled={speakMutation.isPending || isGuideRedirecting}
                    aria-label={isGuideSpeaking ? `Stop ${selectedPathway.guide.name} speaking` : `Listen to ${selectedPathway.guide.name} speak`}
                  >
                    {isGuideSpeaking ? <Square size={13} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                    <span>{speakMutation.isPending ? "Preparing" : isGuideSpeaking ? "Stop" : "Listen"}</span>
                  </button>
                </div>
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
                    {conversationLanguages.map((option) => (
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
                <button className="dock-close" type="button" onClick={closePathway} disabled={chatMutation.isPending || isGuideRedirecting} aria-label="Close conversation">
                  <X size={19} strokeWidth={1.55} />
                </button>
              </div>
            </div>
            {redirectOrigin && (
              <button className="dock-return" type="button" onClick={returnToPreviousGuide} disabled={chatMutation.isPending || isGuideRedirecting}>
                <Undo2 size={14} strokeWidth={1.7} />
                <span>Back to {redirectOrigin.pathway.guide.name}</span>
              </button>
            )}
            <audio ref={guideAudioRef} preload="auto" aria-hidden="true" />
            <div className="dock-note">
              <CircleHelp size={16} strokeWidth={1.5} />
              <span>For grounded, local decisions. Verify time-sensitive or urgent guidance with trusted sources.</span>
            </div>
            {carriedQuestion && (
              <aside className={`carried-question ${isCarriedQuestionPinned ? "is-pinned" : ""}`} aria-label="Carried question">
                <div>
                  <Pin size={14} strokeWidth={1.6} />
                  <span>{isCarriedQuestionPinned ? "Pinned original question" : "Carried question"}</span>
                </div>
                <p>{carriedQuestion}</p>
                <button type="button" onClick={() => setIsCarriedQuestionPinned((pinned) => !pinned)} aria-pressed={isCarriedQuestionPinned}>
                  {isCarriedQuestionPinned ? <PinOff size={13} strokeWidth={1.6} /> : <Pin size={13} strokeWidth={1.6} />}
                  <span>{isCarriedQuestionPinned ? "Unpin" : "Pin"}</span>
                </button>
              </aside>
            )}
            <Suspense fallback={<div className="chat-loading" role="status">Opening your conversation…</div>}>
              <AIChatBox
                messages={messages}
                onSendMessage={sendMessage}
                isLoading={chatMutation.isPending || isGuideRedirecting}
                height="min(52vh, 480px)"
                placeholder="Ask your question…"
                suggestedPrompts={selectedPathway.starterPrompts}
                emptyStateMessage="Start with a practical question"
                className="signal-chatbox"
                errorMessage={chatError}
                onRetry={retryLastMessage}
              />
            </Suspense>
            <div className="dock-bottom-note"><SendHorizonal size={14} strokeWidth={1.6} /> Ask in your own words. Short answers are welcome.</div>
          </section>}
        </div>
      )}
    </main>
  );
}
