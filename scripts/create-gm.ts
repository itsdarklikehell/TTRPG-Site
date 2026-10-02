/**
 * İlk GM hesabını (veya ek GM hesaplarını) oluşturur. Sunucuda bir kez çalıştırılır:
 *   npm run create-gm -- --username fatih --name "Fatih"
 * Rastgele güçlü bir şifre üretir ve yalnızca bir kez ekrana yazar.
 * Kullanıcı varsa: --reset ile şifresini sıfırlar ve GM yapar.
 * Oluşturulan hesap site yöneticisidir (kullanıcı yönetimi, GM daveti); istemiyorsan --no-admin ekle.
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { eq } from "drizzle-orm";

const envFile = process.env.SHZ_ENV_FILE || ".env";
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { db, pool } = await import("../src/db");
const { users, sessions } = await import("../src/db/schema");
const { hashPassword } = await import("../src/lib/auth/password");

function arg(n: string) {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const username = (arg("--username") ?? "").trim().toLowerCase();
const name = (arg("--name") ?? username).trim();
const reset = process.argv.includes("--reset");
const isAdmin = !process.argv.includes("--no-admin");
if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
  console.error('Kullanım: npm run create-gm -- --username fatih --name "Fatih" [--reset]');
  process.exit(1);
}
const password = randomBytes(15).toString("base64url");
const passwordHash = await hashPassword(password);
const existing = await db.query.users.findFirst({ where: eq(users.username, username) });
if (existing && !reset) {
  console.error(`"${username}" zaten var. Şifreyi sıfırlamak için --reset ekle.`);
  process.exit(1);
}
if (existing) {
  await db.update(users).set({ passwordHash, role: "GM", isAdmin, disabled: false }).where(eq(users.id, existing.id));
  await db.delete(sessions).where(eq(sessions.userId, existing.id));
} else {
  await db.insert(users).values({ username, displayName: name, passwordHash, role: "GM", isAdmin });
}
console.log("\n  GM hesabı hazır.");
console.log(`  Kullanıcı adı : ${username}${isAdmin ? "  (site yöneticisi)" : ""}`);
console.log(`  Geçici şifre  : ${password}`);
console.log("  Giriş yaptıktan sonra Hesap sayfasından şifreni değiştir.\n");
await pool.end();
