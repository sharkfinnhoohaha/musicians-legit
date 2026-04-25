import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { generationFeedback } from "@/lib/db/schema";

export const runtime = "nodejs";

const FeedbackSchema = z.object({
  contractId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional(),
  wasCopied: z.boolean().optional(),
  whatWasWrong: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = FeedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    await getDb().insert(generationFeedback).values({
      contractId: parsed.data.contractId,
      rating: parsed.data.rating ?? null,
      wasCopied: parsed.data.wasCopied ?? null,
      whatWasWrong: parsed.data.whatWasWrong ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("[feedback] db error:", err);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
}
