import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { campaignMembers, messages, users } from "@/db/schema";
import { notFound, route } from "@/lib/api";
import { requireCampaignGM } from "@/lib/access";
import { disconnectUserSockets } from "@/lib/auth/core";
import { notifyCampaign } from "@/lib/realtime-bus";

export const DELETE = route({}, async ({ params, user }) => {
  await requireCampaignGM(params.id, user);
  await db.delete(campaignMembers).where(and(eq(campaignMembers.campaignId, params.id), eq(campaignMembers.userId, params.userId)));
  // Açık oda bağlantısını kes; yeniden bağlanınca bu kampanyaya katılamaz.
  disconnectUserSockets(params.userId);
  notifyCampaign(params.id, "members:changed", {});
  return { ok: true };
});

/** GM: oyuncuyu sohbette ve/veya zar atmada susturur ya da susturmayı kaldırır. */
export const PATCH = route(
  { body: z.object({ chatMuted: z.boolean().optional(), rollMuted: z.boolean().optional() }), limit: 60 },
  async ({ params, body, user }) => {
    await requireCampaignGM(params.id, user);
    const [m] = await db
      .update(campaignMembers)
      .set(body)
      .where(and(eq(campaignMembers.campaignId, params.id), eq(campaignMembers.userId, params.userId)))
      .returning();
    if (!m) throw notFound("Oyuncu bu kampanyada değil.");
    const u = await db.query.users.findFirst({ where: eq(users.id, params.userId), columns: { displayName: true } });
    const parts: string[] = [];
    if (body.chatMuted !== undefined) parts.push(body.chatMuted ? "sohbette susturuldu" : "sohbet susturması kaldırıldı");
    if (body.rollMuted !== undefined) parts.push(body.rollMuted ? "zar atmada susturuldu" : "zar susturması kaldırıldı");
    if (parts.length) {
      const [msg] = await db
        .insert(messages)
        .values({ campaignId: params.id, userId: user.id, channel: "SYSTEM", content: `${u?.displayName ?? "Oyuncu"} ${parts.join(", ")}.` })
        .returning();
      notifyCampaign(params.id, "message", { ...msg, userName: user.displayName, characterName: null });
    }
    notifyCampaign(params.id, "mute:changed", { userId: params.userId, chatMuted: m.chatMuted, rollMuted: m.rollMuted });
    return { ok: true, chatMuted: m.chatMuted, rollMuted: m.rollMuted };
  },
);
