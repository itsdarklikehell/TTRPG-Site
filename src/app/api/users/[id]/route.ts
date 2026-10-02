import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { bad, notFound, route } from "@/lib/api";
import { destroyAllSessions } from "@/lib/auth/core";
import { hashPassword } from "@/lib/auth/password";

/** Yalnızca site yöneticisi: hesabı devre dışı bırak / aç, şifre sıfırla. */
export const PATCH = route(
  { auth: "admin", body: z.object({ disabled: z.boolean().optional(), resetPassword: z.boolean().optional() }), limit: 30 },
  async ({ params, body, user }) => {
    if (params.id === user.id) throw bad("Kendi hesabını buradan değiştiremezsin.");
    const u = await db.query.users.findFirst({ where: eq(users.id, params.id) });
    if (!u) throw notFound();
    if (u.isAdmin) throw bad("Başka bir yöneticinin hesabı buradan değiştirilemez.");
    let password: string | undefined;
    if (body.resetPassword) {
      password = randomBytes(12).toString("base64url");
      await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, u.id));
      await destroyAllSessions(u.id);
    }
    if (body.disabled !== undefined) {
      await db.update(users).set({ disabled: body.disabled }).where(eq(users.id, u.id));
      if (body.disabled) await destroyAllSessions(u.id);
    }
    return { ok: true, password };
  },
);
