"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ReflectionBlock = {
  id: string;
  user: string;
  insight: string;
  clarity: string;
  question: string;
  created_at?: string;
};

export default function HomePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reflectionBlocks, setReflectionBlocks] = useState<ReflectionBlock[]>(
    []
  );
  const [streak, setStreak] = useState(0);
  const [todayThread, setTodayThread] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memoryTimeline, setMemoryTimeline] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openLayer, setOpenLayer] = useState<ReflectionBlock | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

    // -----------------------------------------------------------
  // Sync plan (free / pro) for this session
  // -----------------------------------------------------------
  useEffect(() => {
    if (!sessionId) return;

    fetch("/api/me/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.plan === "pro") {
          setPlan("pro");
        }
      })
      .catch(() => {
        // Fail silently — never block the experience
      });
  }, [sessionId]);

  /* -----------------------------------------------------------
     TYPEWRITER EFFECT
  ----------------------------------------------------------- */
  function typewriterEffect(
    fullText: string,
    onUpdate: (partial: string) => void,
    onFinished: () => void
  ) {
    let i = 0;

    function step() {
      onUpdate(fullText.slice(0, i));
      const char = fullText[i - 1];

      const pause =
        char === "." || char === "…" || char === "—"
          ? 320
          : char === ","
          ? 120
          : 24;

      if (i < fullText.length) {
        i++;
        setTimeout(step, pause);
      } else {
        onFinished();
      }
    }

    step();
  }

  /* -----------------------------------------------------------
   INITIAL LOAD
----------------------------------------------------------- */
useEffect(() => {
  const stored = Number(localStorage.getItem("clarity_streak") || 0);
  setStreak(stored);

  let sid = localStorage.getItem("claryon_session_id");
  if (!sid) {
    sid = uuid();
    localStorage.setItem("claryon_session_id", sid);
  }
  setSessionId(sid);

  // Load history first, then thread logic that depends on “today”
  loadConversationHistory(sid);
  loadTodayThread(sid);
  loadSessionMemory(sid);
}, []);

  /* -----------------------------------------------------------
   EMOTIONAL THREAD (MOST RECENT)
----------------------------------------------------------- */
async function loadTodayThread(sessionId: string | null) {
  const { data, error } = await supabase
    .from("clarity_logs")
    .select("daily_thread")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.daily_thread) {
    setTodayThread(null);
    return;
  }

  setTodayThread(data.daily_thread);
}

/* -----------------------------------------------------------
   SESSION MEMORY EVOLUTION — emotional timeline
----------------------------------------------------------- */
async function loadSessionMemory(sessionId: string | null) {
  if (!sessionId) return;

  const { data, error } = await supabase
    .from("session_memory_events")
    .select("content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    setMemoryTimeline([]);
    return;
  }
setMemoryTimeline(
  data
    .map((d) => d.content)
    .filter((c) => c.startsWith("A recurring undercurrent:"))
);
}

  /* -----------------------------------------------------------
     LOAD CONVERSATION HISTORY
  ----------------------------------------------------------- */
  async function loadConversationHistory(sessionId: string | null) {
    if (!sessionId) return;

    const { data } = await supabase
      .from("conversation_messages")
      .select("role, content, id, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (!data) return;

    const blocks: ReflectionBlock[] = [];
    let temp: any = {};

    data.forEach((m) => {
      if (m.role === "user") {
        temp = {
          id: m.id,
          user: m.content,
          insight: "",
          clarity: "",
          question: "",
          created_at: m.created_at,
        };
      } else {
        // For older records that may still contain structured output
        const raw = m.content;

        const insight =
          raw.match(/INSIGHT:\s*([\s\S]*?)THREAD:/i)?.[1]?.trim() || "";
        const clarity =
          raw.match(/CLARITY:\s*([\s\S]*?)QUESTION:/i)?.[1]?.trim() || raw;
        const question =
          raw.match(/QUESTION:\s*(.*)/i)?.[1]?.trim() || "";

        temp.insight = insight;
        temp.clarity = clarity;
        temp.question = question;
        blocks.push({ ...temp });
      }
    });

    setReflectionBlocks(blocks);
    scrollToBottom();
  }

  /* -----------------------------------------------------------
     STREAK
  ----------------------------------------------------------- */
  function updateStreak() {
    const today = new Date().toDateString();
    const last = localStorage.getItem("last_clarity_date");

    let current = Number(localStorage.getItem("clarity_streak") || 0);

    if (last !== today) {
      current = current + 1 || 1;
      localStorage.setItem("clarity_streak", String(current));
      localStorage.setItem("last_clarity_date", today);
    }

    setStreak(current);
  }

  /* -----------------------------------------------------------
     SUBMIT HANDLER
  ----------------------------------------------------------- */
  async function handleClarify() {
    if (!input.trim() || !sessionId) return;

    const userText = input;
    setLoading(true);
    setInput("");

    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  text: userText,
  sessionId,
  plan: "pro",
}),
      });

      const data = await res.json();

      const newBlock: ReflectionBlock = {
        id: uuid(),
        user: userText,
        insight: "",
        clarity: "",
        question: "",
      };

      setReflectionBlocks((prev) => [...prev, newBlock]);

      // Step 1 — INSIGHT
      setTimeout(() => {
        setReflectionBlocks((prev) =>
          prev.map((b) =>
            b.id === newBlock.id ? { ...b, insight: data.insight } : b
          )
        );
      }, 500);

      // Step 2 — CLARITY TYPING
      setTimeout(() => {
        typewriterEffect(
          data.output,
          (partial) => {
            setReflectionBlocks((prev) =>
              prev.map((b) =>
                b.id === newBlock.id ? { ...b, clarity: partial } : b
              )
            );
          },
          () => {
            // Step 3 — QUESTION
            setTimeout(() => {
              setReflectionBlocks((prev) =>
                prev.map((b) =>
                  b.id === newBlock.id
                    ? { ...b, question: data.question }
                    : b
                )
              );
            }, 800);
          }
        );
      }, 1400);

      updateStreak();
      scrollToBottom();
      await loadTodayThread(sessionId);
      await loadSessionMemory(sessionId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 240);
  }

  const latestBlocks = [...reflectionBlocks].slice(-5).reverse();

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */
  return (
    <main className="relative w-full bg-slate-950 text-slate-50">
      {/* BACKGROUND */}
      <div className="ocean-vignette pointer-events-none" />
      <div className="ambient-glow ocean-drift pointer-events-none" />

{/* TOP BAR */}
{!drawerOpen && (
  <header className="fixed top-4 left-4 flex items-center gap-3 z-50">
    <button
      onClick={() => setDrawerOpen((v) => !v)}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/80 shadow-lg hover:bg-slate-900/95 transition"
    >
      <span className="h-0.5 w-4 bg-slate-200 rounded-full mb-1" />
      <span className="h-0.5 w-3 bg-slate-500 rounded-full" />
    </button>

    <span
      className="
        hidden sm:block
        select-none
        text-[0.95rem]
        font-medium
        tracking-[0.06em]
        text-white
        drop-shadow-[0_0_12px_rgba(120,190,255,0.25),0_0_32px_rgba(40,120,200,0.15)]
      "
    >
      Claryon
    </span>
  </header>
)}

      {/* DRAWER */}
      <aside
  className={`
    fixed left-0 top-0 h-full w-[260px] sm:w-[300px]
    bg-slate-950/98 border-r border-slate-800
    px-5 py-6 z-30 transition-transform duration-500
    overflow-y-auto will-change-transform transform-gpu
    ${drawerOpen ? "translate-x-0 backdrop-blur-2xl" : "-translate-x-full backdrop-blur-0"}
  `}
>
        <div className="flex items-center justify-between mb-6">
          <p className="text-[0.65rem] tracking-[0.22em] uppercase text-slate-500">
            Inner Threads
          </p>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-[0.75rem] text-slate-500 hover:text-slate-300"
          >
            Close
          </button>
        </div>

        {/* PRO CTA */}
{plan !== "pro" && (
  <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-4 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
    <p className="text-xs text-slate-300 leading-relaxed">
      Keep this space open.
    </p>

    <p className="mt-1 text-[0.7rem] text-slate-400 leading-relaxed">
      A space that remembers · Unlimited reflections
    </p>

    <button
      disabled={checkoutLoading}
      onClick={async () => {
        try {
          setCheckoutLoading(true);

          const res = await fetch("/api/checkout", {
            method: "POST",
          });

          const data = await res.json();

          if (data?.url) {
            window.location.href = data.url;
          } else {
            throw new Error("No checkout URL returned");
          }
        } catch (err) {
          console.error(err);
          alert("Something went wrong starting checkout.");
          setCheckoutLoading(false);
        }
      }}
      className="
        mt-3 w-full
        rounded-full
        bg-gradient-to-br from-cyan-400 via-sky-300 to-emerald-300
        px-4 py-2
        text-[0.75rem] font-medium
        text-slate-900
        shadow-[0_10px_30px_rgba(34,211,238,0.35)]
        hover:brightness-105
        transition
        disabled:opacity-60
        disabled:cursor-not-allowed
      "
    >
      {checkoutLoading
        ? "Opening…"
        : "Keep the space open — $16 / month"}
    </button>
  </div>
)}


        {/* TODAY */}
        <div className="space-y-6 text-sm">
          <div className="space-y-2">
            <p className="text-[0.7rem] uppercase tracking-[0.2em] text-cyan-300">
              Today
            </p>
            {todayThread ? (
              <p className="text-slate-200 italic leading-relaxed">
                {todayThread}
              </p>
            ) : (
              <p className="text-slate-500 text-xs leading-relaxed">
                After you share something today, a thread will quietly appear
                here.
              </p>
            )}
          </div>

          <div className="h-px bg-slate-800" />

          {/* SESSION MEMORY TIMELINE */}
<div className="space-y-2">
  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">
    Emotional timeline
  </p>

  {memoryTimeline.length === 0 ? (
    <p className="text-slate-500 text-xs leading-relaxed">
      Threads will begin to collect here as you continue.
    </p>
  ) : (
    <div className="space-y-2 pr-1">
      {memoryTimeline.map((t, idx) => (
        <p
          key={idx}
          className="text-slate-300 text-xs italic leading-relaxed"
        >
          {t}
        </p>
      ))}
    </div>
  )}
</div>

          {/* RECENT */}
<div className="space-y-3">
  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">
    Recent layers
  </p>

  {latestBlocks.length === 0 ? (
    <p className="text-slate-500 text-xs leading-relaxed">
      This drawer will gently collect the last few things you’ve laid down.
    </p>
  ) : (
    <div className="space-y-3 pr-1">
      {latestBlocks.map((b) => (
        <button
          key={b.id}
          onClick={() => setOpenLayer(b)}
          className="
            w-full text-left
            rounded-2xl
            border border-slate-800
            bg-slate-900/80
            px-4 py-3
            shadow-lg
            hover:bg-slate-900/95
            transition
          "
        >
          <p className="text-slate-300 text-xs whitespace-pre-wrap line-clamp-3">
            {b.user}
          </p>

          {b.insight && (
            <p className="mt-2 text-[0.7rem] text-cyan-100/90 line-clamp-2">
              {b.insight}
            </p>
          )}
        </button>
      ))}
    </div>
  )}
</div>

          {/* STREAK */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-[0.7rem] text-slate-500">
            <span>Days you’ve shown up</span>
            <span className="text-cyan-200/90">{streak} days</span>
          </div>
        </div>
      </aside>

      {/* RECENT LAYER MODAL */}
{openLayer && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={() => setOpenLayer(null)}
  >
    <div
      className="
        w-full max-w-xl
        rounded-2xl
        bg-slate-950/95
        border border-white/10
        p-6
        shadow-2xl
      "
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">
          Recent layer
        </p>
        <button
          onClick={() => setOpenLayer(null)}
          className="text-xs text-slate-400 hover:text-white transition"
        >
          Close
        </button>
      </div>

      <div className="space-y-6 text-slate-200 text-sm leading-relaxed">
  <div>
    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500 mb-1">
      What you laid down
    </p>
    <p className="whitespace-pre-wrap">{openLayer.user}</p>
  </div>

  {openLayer.insight && (
    <div>
      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-cyan-200 mb-1">
        Insight
      </p>
      <p className="whitespace-pre-wrap">{openLayer.insight}</p>
    </div>
  )}

  {openLayer.clarity && (
    <div>
      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-cyan-300 mb-1">
        Clarity
      </p>
      {openLayer.clarity.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-wrap mb-2">
          {para}
        </p>
      ))}
    </div>
  )}

  {openLayer.question && (
    <div>
      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400 mb-1">
        A soft question
      </p>
      <p className="whitespace-pre-wrap">{openLayer.question}</p>
    </div>
  )}
</div>
    </div>
  </div>
)}

      {/* MAIN CONTENT */}
      <div
  className="
    relative z-10
    flex flex-col items-center
    px-4 sm:px-6
    pt-16 pb-14
  "
>
        <div
  className="
    w-full
    max-w-xl sm:max-w-2xl lg:max-w-3xl
    space-y-10
  "
>
          {/* HERO */}
          <section className="text-center space-y-3">
            <h1 className="text-[1.9rem] md:text-[2.6rem] font-light leading-tight text-slate-50 tracking-tight">
              Turn mental noise
              <br />
              into calm clarity.
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-lg mx-auto">
              A quiet room for your inner world — a place where nothing needs to
              be managed or performed.
            </p>
          </section>

          {/* REFLECTION STREAM */}
          <div className={`${todayThread ? "space-y-10" : "space-y-8 -mt-4"}`}>
            {reflectionBlocks.map((block) => (
              <section
                key={block.id}
                className="glass-panel px-6 md:px-8 py-7 space-y-6 shadow-[0_0_55px_rgba(10,15,25,0.7)] animate-message-in"
              >
                {/* USER */}
                <div className="space-y-1.5">
                  <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
                    What you laid down
                  </p>
                  <p className="text-slate-100 whitespace-pre-wrap text-[1.02rem] md:text-[1.07rem] leading-relaxed max-w-prose">
                    {block.user}
                  </p>
                </div>

                {/* INSIGHT — same palette, slightly brighter, subtle glow */}
                {block.insight && (
                  <section className="bg-slate-900/70 border border-cyan-200/26 rounded-2xl px-5 py-4 space-y-2 shadow-[0_0_40px_rgba(8,47,73,0.6)]">
                    <h3 className="text-[0.72rem] uppercase tracking-[0.22em] text-cyan-100/95">
                      Insight
                    </h3>
                    <p className="text-slate-50 text-[0.95rem] leading-relaxed max-w-prose">
                      {block.insight}
                    </p>
                  </section>
                )}

                {/* CLARITY — multi-paragraph, main body */}
                {block.clarity && (
                  <section className="relative bg-slate-950/70 border border-cyan-300/22 rounded-2xl px-5 py-4 space-y-2 shadow-[0_0_60px_rgba(10,15,25,0.8)]">
                    <h3 className="text-[0.7rem] uppercase tracking-[0.22em] text-cyan-200/90">
                      Clarity
                    </h3>
                    <div className="max-w-prose space-y-3">
                      {block.clarity
                        .split(/\n{2,}/)
                        .map((para, idx) => (
                          <p
                            key={idx}
                            className="text-slate-50 whitespace-pre-wrap text-[0.98rem] leading-relaxed"
                          >
                            {para}
                          </p>
                        ))}
                    </div>
                  </section>
                )}

                {/* QUESTION — smoother typography, no italics */}
                {block.question && (
                  <section className="bg-slate-900/55 border border-slate-700/40 rounded-2xl px-5 py-4 space-y-2 shadow-[0_0_40px_rgba(10,15,25,0.7)]">
                    <h3 className="text-[0.72rem] uppercase tracking-[0.22em] text-slate-400/95">
                      A soft question
                    </h3>
                    <p className="text-slate-200 text-[0.98rem] md:text-[1.02rem] leading-relaxed max-w-prose">
                      {block.question}
                    </p>
                  </section>
                )}
              </section>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* INPUT AREA */}
          <section className="glass-panel px-6 md:px-8 py-7 shadow-[0_0_60px_rgba(10,15,25,0.8)]">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-300/90">
                  Say what’s here — whatever it is.
                </p>
                <p className="text-[0.72rem] md:text-sm text-slate-500/80 leading-relaxed">
                  You don’t have to prepare anything. Just start where you are.
                </p>
              </div>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                placeholder="Let whatever’s here come through…"
                className="
                  w-full resize-none
                  bg-transparent border border-slate-700/70 rounded-2xl
                  px-5 py-4
                  text-base text-slate-100 placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-cyan-300/60
                "
              />

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleClarify}
                  disabled={loading}
                  className="
                    rounded-full bg-gradient-to-br from-cyan-400 via-sky-300 to-emerald-300
                    text-slate-900 font-medium px-10 py-3
                    shadow-[0_18px_60px_rgba(34,211,238,0.4)]
                    hover:brightness-105 hover:shadow-[0_22px_70px_rgba(34,211,238,0.5)]
                    transition disabled:opacity-60 disabled:cursor-not-allowed
                  "
                >
                  {loading ? "Listening…" : "Clarify"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}