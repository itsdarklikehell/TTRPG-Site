import { desc, eq } from "drizzle-orm";
// Davetler: her GM yalnızca kendi davetlerini görür; yönetici hepsini görür.
import { z } from "zod";
import { db } from "@/db";
import { campaigns, invites, users } from "@/db/schema";
import { bad, route, zId } from "@/lib/api";
import { sha256 } from "@/lib/auth/core";
import { inviteCode, normalizeCode } from "@/lib/codes";

export const GET = route({ auth: "gm" }, async ({ user }) => {
  const rows = await db
    .select({
      id: invites.id,
      hint: invites.hint,
      note: invites.note,
      role: invites.role,
      memberRole: invites.memberRole,
      campaignName: campaigns.name,
      usedBy: users.displayName,
      usedAt: invites.usedAt,
      expiresAt: invites.expiresAt,
      revokedAt: invites.revokedAt,
      createdAt: invites.createdAt,
    })
    .from(invites)
    .leftJoin(campaigns, eq(campaigns.id, invites.campaignId))
    .leftJoin(users, eq(users.id, invites.usedById))
    .where(user.isAdmin ? undefined : eq(invites.createdById, user.id))
    .orderBy(desc(invites.createdAt))
    .limit(200);
  return { invites: rows };
});

export const POST = route(
  {
    auth: "gm",
    limit: 30,
    body: z.object({
      note: z.string().trim().max(80).optional(),
      role: z.enum(["PLAYER", "GM"]).default("PLAYER"),
      memberRole: z.enum(["PLAYER", "SPECTATOR"]).default("PLAYER"),
      campaignId: zId.nullable().optional(),
      days: z.number().int().min(1).max(30).default(7),
    }),
  },
  async ({ body, user }) => {
    if (body.role === "GM" && !user.isAdmin) throw bad("GM daveti yalnızca site yöneticisi tarafından üretilebilir.");
    if (body.memberRole === "SPECTATOR" && !body.campaignId) throw bad("İzleyici daveti için bir kampanya seç.");
    if (body.campaignId) {
      const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, body.campaignId) });
      if (!c || c.gmId !== user.id) throw bad("Kampanya bulunamadı.");
    }
    const code = inviteCode();
    await db.insert(invites).values({
      codeHash: sha256(normalizeCode(code)),
      hint: code.slice(-4),
      note: body.note || null,
      role: body.role,
      campaignId: body.campaignId ?? null,
      memberRole: body.memberRole,
      createdById: user.id,
      expiresAt: new Date(Date.now() + body.days * 86_400_000),
    });
    return { code };
  },
);
