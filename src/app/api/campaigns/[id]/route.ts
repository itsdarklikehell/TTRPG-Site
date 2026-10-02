import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { bad, route } from "@/lib/api";
import { requireCampaignGM } from "@/lib/access";
import { LEVEL_CAP_MAX } from "@/lib/shz/constants";
import { content } from "@/lib/shz/content";

export const PATCH = route(
  {
    body: z.object({
      name: z.string().trim().min(2).max(80).optional(),
      contentKey: z.string().max(80).nullable().optional(),
      description: z.string().trim().max(2000).optional(),
      startPerkPoints: z.number().int().min(0).max(10).optional(),
      levelCap: z.number().int().min(1).max(LEVEL_CAP_MAX).optional(),
      deathSaveEnabled: z.boolean().optional(),
      status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
    }),
  },
  async ({ params, body, user }) => {
    await requireCampaignGM(params.id, user);
    if (body.contentKey && !content().campaigns.some((c) => c.key === body.contentKey)) throw bad("Bilinmeyen kampanya.");
    await db.update(campaigns).set(body).where(eq(campaigns.id, params.id));
    return { ok: true };
  },
);
