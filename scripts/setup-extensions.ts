// Run once after `db:push` to install the required Postgres extensions on Neon.
// Idempotent — safe to re-run.

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run `vercel env pull .env.local` first.");
  const sql = neon(url);
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  console.log("✓ pgvector + pg_trgm installed");

  // Trigram index for keyword search (idempotent)
  try {
    await sql`CREATE INDEX IF NOT EXISTS clauses_trgm_idx ON clauses USING gin ((body_markdown || ' ' || title) gin_trgm_ops)`;
    console.log("✓ trigram index ensured");
  } catch (e) {
    // Table may not exist yet on first run — `db:push` creates it.
    console.warn("ℹ trigram index will be created after first `db:push`:", (e as Error).message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
