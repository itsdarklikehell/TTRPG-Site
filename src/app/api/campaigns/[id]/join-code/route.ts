import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { route } from "@/lib/api";
import { requireCampaignGM } from "@/lib/access";
import { joinCode } from "@/lib/codes";

/** Katılma kodunu yeniler (eski kod geçersiz olur). */
export const POST = route({}, async ({ params, user }) => {
  await requireCampaignGM(params.id, user);
  const code = joinCode();
  await db.update(campaigns).set({ joinCode: code }).where(eq(campaigns.id, params.id));
  return { joinCode: code };
});
