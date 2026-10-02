import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { db } from "../../db";
import { loginAttempts } from "../../db/schema";

// Giriş/kayıt gibi hassas uçlar için veritabanı tabanlı sınırlama (yeniden
// başlatmada sıfırlanmaz). Diğer uçlar için bellek içi kova kullanılır.

export async function tooManyAttempts(key: string, max: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs);
  const [r] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.key, key), gt(loginAttempts.createdAt, since)));
  return (r?.n ?? 0) >= max;
}

export async function recordAttempt(key: string) {
  await db.insert(loginAttempts).values({ key });
  // Arada bir eski kayıtları temizle.
  if (Math.random() < 0.02) await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 86_400_000)));
}

const buckets = new Map<string, { n: number; reset: number }>();
/** Bellek içi sabit pencere sınırlayıcı. true = izin verildi. */
export function hit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.n++;
  return b.n <= max;
}
