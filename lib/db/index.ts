// Lazy DB client — avoids build-time crashes when DATABASE_URL is unset.
// See vercel-storage skill: "Do NOT use Proxy wrappers around the DB client."
// This is a plain function-based lazy initializer.

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `vercel env pull .env.local` after linking your project to a Neon database via the Vercel Marketplace.",
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) _db = createDb();
  return _db;
}

export { schema };
