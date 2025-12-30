"use client";

export default function PricingPage() {
  async function startCheckout() {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-slate-900/40 p-8">
        <h1 className="text-2xl font-light">Claryon</h1>
        <p className="mt-3 text-slate-300 leading-relaxed">
          €16/month. A quiet place to slow down and hear yourself more clearly.
        </p>

        <button
          onClick={startCheckout}
          className="mt-6 w-full rounded-full bg-gradient-to-br from-cyan-400 via-sky-300 to-emerald-300 text-slate-900 font-medium px-6 py-3 hover:brightness-105 transition"
        >
          Start €16/month
        </button>

        <p className="mt-4 text-xs text-slate-500">
          Cancel anytime. Secure checkout via Stripe.
        </p>
      </div>
    </main>
  );
}
