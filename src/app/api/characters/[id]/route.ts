import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { bad, forbidden, route } from "@/lib/api";
import { characterAccess, ownerCharacter, publicCharacter } from "@/lib/access";
import { notifyCampaign } from "@/lib/realtime-bus";

export const GET = route({}, async ({ params, user }) => {
  const a = await characterAccess(params.id, user);
  if (a.isGM) return { character: a.character, view: "gm" };
  if (a.isOwner) return { character: ownerCharacter(a.character), view: "owner" };
  return { character: publicCharacter(a.character), view: "public" };
});

/**
 * Karakteri kalıcı olarak siler (sahibi veya kampanyanın GM'i).
 * Güvenlik için karakterin adı birebir yazılmalı. Geçmiş zar ve mesajlar kalır, karakter bağlantısı kopar.
 */
export const DELETE = route({ body: z.object({ confirmName: z.string().max(80) }), limit: 10 }, async ({ params, body, user }) => {
  const a = await characterAccess(params.id, user);
  if (!a.isGM && !a.isOwner) throw forbidden();
  if (body.confirmName.trim() !== a.character.name) throw bad("Onay için karakterin adını aynen yazmalısın.");
  await db.delete(characters).where(eq(characters.id, a.character.id));
  notifyCampaign(a.campaign.id, "character:deleted", { characterId: a.character.id });
  notifyCampaign(a.campaign.id, "approvals:changed", {});
  return { ok: true, campaignId: a.campaign.id };
});
