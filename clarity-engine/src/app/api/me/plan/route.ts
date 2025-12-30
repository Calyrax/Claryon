import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ plan: "free" });
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("session_id", sessionId)
    .eq("status", "active")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("❌ Plan lookup failed:", error);
  }

  return NextResponse.json({
    plan: data?.status === "active" ? "pro" : "free",
  });
}