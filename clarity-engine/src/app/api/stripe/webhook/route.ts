import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Invalid Stripe signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // ---------------------------------------------
    // Checkout completed → activate Pro
    // ---------------------------------------------
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const sessionId =
        session.client_reference_id ||
        session.metadata?.sessionId;

      if (!sessionId || !session.subscription || !session.customer) {
        console.warn("⚠️ Missing sessionId / subscription / customer");
        return NextResponse.json({ received: true });
      }

      await supabase.from("subscriptions").upsert(
        {
          session_id: sessionId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          status: "active",
          plan: "pro",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );

      console.log("✅ Pro activated for session:", sessionId);
    }

    // ---------------------------------------------
    // Subscription updated or canceled → sync plan
    // ---------------------------------------------
    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;

      const status = subscription.status;
      const plan = status === "active" ? "pro" : "free";

      await supabase
        .from("subscriptions")
        .update({
          status,
          plan,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      console.log(
        `🔄 Subscription ${subscription.id} → ${status}`
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}