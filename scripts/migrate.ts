/** Bekleyen veritabanı migration'larını uygular (deploy sırasında çalışır). */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL tanımlı değil");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
await migrate(drizzle(pool), { migrationsFolder: path.resolve(here, "..", "drizzle") });
await pool.end();
console.log("Migration'lar uygulandı.");
