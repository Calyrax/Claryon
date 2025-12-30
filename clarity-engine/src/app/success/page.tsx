"use client";

import { useSearchParams } from "next/navigation";

export default function SuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-slate-900/40 p-8">
        <h1 className="text-2xl font-light">You’re in.</h1>
        <p className="mt-3 text-slate-300 leading-relaxed">
          Your subscription is active. You can open Claryon now.
        </p>

        {sessionId && (
          <p className="mt-4 text-xs text-slate-500 break-all">
            Session: {sessionId}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <a
            href="/clarify"
            className="rounded-full bg-cyan-300 text-slate-900 px-6 py-2 font-medium hover:brightness-105 transition"
          >
            Open Claryon
          </a>
          <a
            href="/"
            className="rounded-full border border-white/10 px-6 py-2 text-slate-200 hover:bg-white/5 transition"
          >
            Back home
          </a>
        </div>
      </div>
    </main>
  );
}