import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { route } from "@/lib/api";
import { characterEditor } from "@/lib/access";
import { characterChanged } from "@/lib/realtime-bus";

/** Oyuncunun kendi düzenleyebildiği alanlar. */
export const PATCH = route(
  {
    limit: 60,
    body: z.object({
      background: z.string().trim().max(4000).optional(),
      appearance: z.string().trim().max(1000).optional(),
      notes: z.string().max(8000).optional(),
      secretNotes: z.string().max(6000).optional(),
      money: z.number().int().min(-1_000_000).max(100_000_000).optional(),
      inventory: z
        .array(
          z.object({
            id: z.string().max(40),
            name: z.string().trim().min(1).max(80),
            qty: z.number().int().min(0).max(9999),
            note: z.string().trim().max(200),
          }),
        )
        .max(100)
        .optional(),
    }),
  },
  async ({ params, body, user }) => {
    const { character: c, campaign } = await characterEditor(params.id, user);
    await db.update(characters).set(body).where(eq(characters.id, c.id));
    characterChanged(campaign.id, c.id);
    return { ok: true };
  },
);
