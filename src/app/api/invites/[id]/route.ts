import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { route } from "@/lib/api";

export const DELETE = route({ auth: "gm" }, async ({ params, user }) => {
  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.id, params.id), isNull(invites.usedById), isNull(invites.revokedAt), user.isAdmin ? undefined : eq(invites.createdById, user.id)));
  return { ok: true };
});
