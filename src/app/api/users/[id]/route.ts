import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { bad, notFound, route } from "@/lib/api";
import { destroyAllSessions } from "@/lib/auth/core";

/** Yalnızca site yöneticisi: hesabı devre dışı bırak / aç. */
export const PATCH = route({ auth: "admin", body: z.object({ disabled: z.boolean() }) }, async ({ params, body, user }) => {
  if (params.id === user.id) throw bad("Kendi hesabını değiştiremezsin.");
  const u = await db.query.users.findFirst({ where: eq(users.id, params.id) });
  if (!u) throw notFound();
  if (u.isAdmin) throw bad("Başka bir yöneticinin hesabı buradan değiştirilemez.");
  await db.update(users).set({ disabled: body.disabled }).where(eq(users.id, u.id));
  if (body.disabled) await destroyAllSessions(u.id);
  return { ok: true };
});
