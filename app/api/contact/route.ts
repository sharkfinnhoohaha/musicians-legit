import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { name?: string; email?: string; topic?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const message = String(body.message ?? "").trim();
  const name = body.name ? String(body.name).slice(0, 120) : null;
  const topic = body.topic ? String(body.topic).slice(0, 80) : null;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
  }
  if (!message || message.length < 4) {
    return NextResponse.json({ error: "Please add a message." }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    console.warn(`[contact] DATABASE_URL not set — would have stored from ${email} (${topic})`);
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const db = getDb();
    await db.insert(schema.contactSubmissions).values({ name, email, topic, message });
    return NextResponse.json({ ok: true, persisted: true });
  } catch (err: any) {
    console.error("[contact] insert failed:", err);
    return NextResponse.json(
      { error: "Couldn’t send your message right now. Please email us directly." },
      { status: 500 },
    );
  }
}
