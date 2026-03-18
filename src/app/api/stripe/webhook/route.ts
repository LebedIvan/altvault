import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// App Router reads raw body via req.text() — no config needed
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.warn("[stripe/webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email =
      (session.metadata?.email as string | undefined) ?? session.customer_email ?? "";

    if (email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
        await fetch(`${baseUrl}/api/preregister`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            plan: "premium",
            stripeSessionId: session.id,
          }),
        });
        console.log(`[stripe/webhook] Premium pre-registration recorded for ${email}`);
      } catch (err) {
        console.error("[stripe/webhook] Failed to record pre-registration:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
