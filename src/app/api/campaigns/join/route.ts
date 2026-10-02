import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { campaignMembers, campaigns } from "@/db/schema";
import { ApiError, bad, route } from "@/lib/api";
import { hit } from "@/lib/auth/ratelimit";
import { normalizeCode } from "@/lib/codes";
import { notifyCampaign } from "@/lib/realtime-bus";

export const POST = route({ body: z.object({ code: z.string().trim().min(4).max(20) }), limit: 20 }, async ({ body, user }) => {
  if (!hit(`join:${user.id}`, 10, 10 * 60_000)) throw new ApiError(429, "Çok fazla deneme.");
  const n = normalizeCode(body.code);
  const code = `${n.slice(0, 4)}-${n.slice(4, 8)}`;
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.joinCode, code) });
  if (!c || c.status === "ARCHIVED") throw bad("Kod geçersiz.");
  if (c.gmId !== user.id) {
    await db.insert(campaignMembers).values({ campaignId: c.id, userId: user.id }).onConflictDoNothing();
    notifyCampaign(c.id, "members:changed", {});
  }
  return { id: c.id };
});
