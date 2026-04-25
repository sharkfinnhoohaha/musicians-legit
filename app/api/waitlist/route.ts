import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const context = body.context ? String(body.context).slice(0, 64) : null;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
  }

  // If DATABASE_URL isn't set in dev, fail soft so the form still feels alive.
  if (!process.env.DATABASE_URL) {
    console.warn(`[waitlist] DATABASE_URL not set — would have stored: ${email} (${context})`);
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const db = getDb();
    const referrer = req.headers.get("referer") ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    await db
      .insert(schema.waitlistSubscribers)
      .values({ email, context, referrer, userAgent })
      .onConflictDoUpdate({
        target: schema.waitlistSubscribers.email,
        set: { context: sql`EXCLUDED.context`, referrer: sql`EXCLUDED.referrer` },
      });

    return NextResponse.json({ ok: true, persisted: true });
  } catch (err: any) {
    console.error("[waitlist] insert failed:", err);
    return NextResponse.json(
      { error: "Couldn’t save your email right now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
