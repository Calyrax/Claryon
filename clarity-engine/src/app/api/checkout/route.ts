import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs"; // ensure Node runtime for Stripe

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId : null;

    const priceId = process.env.STRIPE_PRICE_ID!;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing STRIPE_PRICE_ID" },
        { status: 500 }
      );
    }

    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  payment_method_types: ["card"],
  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],

  // 🔑 link Stripe checkout to your app session
  client_reference_id: sessionId ?? undefined,
  metadata: sessionId ? { sessionId } : undefined,

  success_url: `${baseUrl}/clarify`,
  cancel_url: `${baseUrl}/clarify`,
  allow_promotion_codes: true,
});

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);

    return NextResponse.json(
      { error: err?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}