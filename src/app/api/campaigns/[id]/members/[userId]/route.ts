import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { campaignMembers, messages, users } from "@/db/schema";
import { notFound, route } from "@/lib/api";
import { requireCampaignGM } from "@/lib/access";
import { disconnectUserSockets } from "@/lib/auth/core";
import { notifyCampaign, notifyUser } from "@/lib/realtime-bus";

export const DELETE = route({}, async ({ params, user }) => {
  const campaign = await requireCampaignGM(params.id, user);
  const del = await db
    .delete(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, params.id), eq(campaignMembers.userId, params.userId)))
    .returning({ userId: campaignMembers.userId });
  if (!del.length) throw notFound("Oyuncu bu kampanyada değil.");
  const u = await db.query.users.findFirst({ where: eq(users.id, params.userId), columns: { displayName: true } });
  // Oyuncuya haber ver, sonra açık oda bağlantısını kes; yeniden bağlanınca bu kampanyaya katılamaz.
  notifyUser(params.userId, "kicked", { campaignId: params.id, campaignName: campaign.name });
  setTimeout(() => disconnectUserSockets(params.userId), 300);
  const [msg] = await db
    .insert(messages)
    .values({ campaignId: params.id, userId: user.id, channel: "SYSTEM", content: `${u?.displayName ?? "Oyuncu"} kampanyadan çıkarıldı.` })
    .returning();
  notifyCampaign(params.id, "message", { ...msg, userName: user.displayName, characterName: null });
  // Bu oyuncunun karakterlerini bekleyen zar isteklerinden düş.
  type Req = { id: string; characters: { id: string; userId: string }[]; remaining: string[] };
  const reqs = (globalThis as { __shzPending?: Map<string, Map<string, Req>> }).__shzPending?.get(params.id);
  for (const r of reqs?.values() ?? []) {
    const gone = r.characters.filter((c) => c.userId === params.userId).map((c) => c.id);
    if (!gone.length) continue;
    r.remaining = r.remaining.filter((x) => !gone.includes(x));
    if (!r.remaining.length) {
      reqs!.delete(r.id);
      notifyCampaign(params.id, "roll:request:done", { id: r.id });
    } else {
      const { remaining, ...rest } = r;
      notifyCampaign(params.id, "roll:request", { ...rest, characters: r.characters.filter((c) => remaining.includes(c.id)) });
    }
  }
  notifyCampaign(params.id, "members:changed", { removed: params.userId });
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
