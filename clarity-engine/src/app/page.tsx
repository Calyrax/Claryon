"use client";

import { useState } from "react";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    try {
      setLoading(true);

      // -------------------------------------------------
      // Get or create Claryon session ID
      // -------------------------------------------------
      let sessionId = localStorage.getItem("claryon_session_id");

      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("claryon_session_id", sessionId);
      }

      // -------------------------------------------------
      // Start Stripe Checkout
      // -------------------------------------------------
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Something went wrong starting checkout.");
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-slate-950 text-slate-50 overflow-hidden">
      {/* BACKGROUND */}
      <div className="ocean-vignette pointer-events-none" />
      <div className="ambient-glow ocean-drift pointer-events-none" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xl space-y-10">

          {/* LOGO */}
          <h1 className="text-[2.4rem] md:text-[3rem] font-light tracking-tight">
            Claryon
          </h1>

          {/* HERO */}
          <div className="space-y-4">
            <p className="text-[1.35rem] md:text-[1.55rem] text-slate-200 leading-relaxed">
              Turn mental noise into calm clarity.
            </p>

            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              A quiet place to lay things down  
              when your mind feels heavy.
            </p>
          </div>

          {/* PRIMARY ACTION */}
          <div className="pt-6 space-y-4">
            <a
              href="/clarify"
              className="
                inline-flex items-center justify-center
                rounded-full
                bg-gradient-to-br from-cyan-400 via-sky-300 to-emerald-300
                px-12 py-3.5
                text-slate-900 font-medium
                shadow-[0_18px_60px_rgba(34,211,238,0.4)]
                hover:brightness-105
                hover:shadow-[0_22px_70px_rgba(34,211,238,0.5)]
                transition
              "
            >
              Enter Claryon
            </a>

            <p className="text-xs text-slate-500">
              Free to begin · No account required
            </p>
          </div>

          {/* SECONDARY ACTION */}
          <div className="pt-4 flex flex-col items-center space-y-3">
            <button
              onClick={startCheckout}
              disabled={loading}
              className="
                inline-flex items-center justify-center
                rounded-full
                border border-slate-700
                bg-slate-900/40
                px-6 py-2.5
                text-sm text-slate-200
                backdrop-blur
                hover:border-slate-500
                hover:bg-slate-900/70
                hover:text-white
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading
                ? "Opening…"
                : "Keep the space open — $16 / month"}
            </button>

            <p className="text-xs text-slate-500 text-center">
              Unlimited reflections · Long-term memory · Cancel anytime
            </p>
          </div>

          {/* FOOTNOTE */}
          <div className="pt-10 text-xs text-slate-500 leading-relaxed space-y-1">
            <p>This is not therapy.</p>
            <p>Not advice.</p>
            <p>Not productivity.</p>
            <p className="pt-2">
              Just a steady place to return  
              when you feel human.
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}