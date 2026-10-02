import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __shzPool: pg.Pool | undefined;
}

function makePool() {
  const url = process.env.DATABASE_URL;
  // Build sırasında (CI) veritabanı yoktur; bağlantı ilk sorguda kurulur ve
  // adres yoksa o anda anlaşılır bir hata verir.
  if (!url && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build")
    console.warn("[db] DATABASE_URL tanımlı değil");
  return new pg.Pool({ connectionString: url || "postgresql://tanimsiz@127.0.0.1:1/tanimsiz", max: 10, idleTimeoutMillis: 30_000 });
}

export const pool = globalThis.__shzPool ?? makePool();
globalThis.__shzPool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { schema };
