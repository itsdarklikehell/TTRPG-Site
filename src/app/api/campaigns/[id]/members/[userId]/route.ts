import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignMembers } from "@/db/schema";
import { route } from "@/lib/api";
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
