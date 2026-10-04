import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { route } from "@/lib/api";
import { requireCampaignGM } from "@/lib/access";
import { joinCode } from "@/lib/codes";

/** İzleyici katılma kodunu üretir ya da yeniler (eski kod geçersiz olur). */
export const POST = route({}, async ({ params, user }) => {
  await requireCampaignGM(params.id, user);
  const code = joinCode();
  await db.update(campaigns).set({ spectatorCode: code }).where(eq(campaigns.id, params.id));
  return { spectatorCode: code };
});

/** İzleyici kodunu kapatır. */
export const DELETE = route({}, async ({ params, user }) => {
  await requireCampaignGM(params.id, user);
  await db.update(campaigns).set({ spectatorCode: null }).where(eq(campaigns.id, params.id));
  return { ok: true };
});
