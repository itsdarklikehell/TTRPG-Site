import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { campaignMembers, campaigns, characters } from "@/db/schema";
import { Badge, Card, Empty, LinkButton, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { pageUser } from "@/lib/auth/session";
import { content, getTree } from "@/lib/shz/content";
import { JoinCampaign } from "./join-campaign";

export const metadata: Metadata = { title: "Panel" };

export default async function Panel() {
  const user = await pageUser();
  const memberOf = db.select({ id: campaignMembers.campaignId }).from(campaignMembers).where(eq(campaignMembers.userId, user.id));
  const camps = await db
    .select()
    .from(campaigns)
    .where(or(eq(campaigns.gmId, user.id), inArray(campaigns.id, memberOf)))
    .orderBy(desc(campaigns.createdAt));
  const chars = await db
    .select({ c: characters, campaignName: campaigns.name })
    .from(characters)
    .innerJoin(campaigns, eq(campaigns.id, characters.campaignId))
    .where(eq(characters.userId, user.id))
    .orderBy(desc(characters.updatedAt));
  const pending = camps.length
    ? await db
        .select({ id: characters.id, campaignId: characters.campaignId })
        .from(characters)
        .where(and(eq(characters.status, "PENDING"), inArray(characters.campaignId, camps.filter((c) => c.gmId === user.id).map((c) => c.id).concat(["-"]))))
    : [];
  const info = new Map(content().campaigns.map((c) => [c.key, c]));

  return (
    <div>
      <PageHeader
        kicker="Panel"
        title={`Hoş geldin, ${user.displayName}`}
        actions={user.role === "GM" ? <LinkButton href="/kampanya/yeni" variant="primary">Yeni kampanya</LinkButton> : undefined}
      >
        Kampanyalarına gir, karakterini yönet ya da kuralları incele.
      </PageHeader>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <section>
            <SectionTitle>Kampanyalar</SectionTitle>
            {camps.length === 0 ? (
              <Empty title="Henüz bir kampanyada değilsin">GM'inden kampanya katılma kodunu iste ve sağdaki kutuya yaz.</Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {camps.map((c) => {
                  const ci = c.contentKey ? info.get(c.contentKey) : undefined;
                  const waiting = pending.filter((p) => p.campaignId === c.id).length;
                  return (
                    <Card key={c.id} className="group flex flex-col p-5 transition hover:border-accent/40">
                      <div className="flex items-start gap-3">
                        {ci?.emblem ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/schwarzesonne${ci.emblem}`} alt="" className="h-12 w-12 shrink-0 rounded-md object-contain" />
                        ) : (
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-surface2 text-xl">☀️</div>
                        )}
                        <div className="min-w-0">
                          <Link href={`/kampanya/${c.id}`} className="font-serif text-lg leading-tight text-ink hover:text-accent">
                            {c.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {c.gmId === user.id && <Badge tone="accent">GM</Badge>}
                            {ci && <Badge>{ci.difficulty}</Badge>}
                            {c.status !== "ACTIVE" && <Badge tone="warn">{c.status === "PAUSED" ? "Duraklatıldı" : "Arşiv"}</Badge>}
                            {waiting > 0 && <Badge tone="warn">{waiting} onay bekliyor</Badge>}
                          </div>
                        </div>
                      </div>
                      {c.description && <p className="mt-3 line-clamp-2 text-sm text-muted">{c.description}</p>}
                      <div className="mt-auto flex gap-2 pt-4">
                        <LinkButton href={`/kampanya/${c.id}/oda`} variant="primary" size="sm">
                          Oyun odası
                        </LinkButton>
                        <LinkButton href={`/kampanya/${c.id}`} size="sm">
                          Kampanya
                        </LinkButton>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Karakterlerin</SectionTitle>
            {chars.length === 0 ? (
              <Empty title="Henüz karakterin yok">Bir kampanyaya katıldıktan sonra kampanya sayfasından karakter oluşturabilirsin.</Empty>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {chars.map(({ c, campaignName }) => (
                  <Link key={c.id} href={`/karakter/${c.id}`} className="card flex items-center gap-4 p-4 transition hover:border-accent/40">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-line bg-surface2 font-mono text-lg text-accent">
                      {c.level}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-base text-ink">{c.name}</p>
                      <p className="truncate text-xs text-muted">
                        {campaignName} · {c.trees.map((t) => getTree(t)?.name ?? t).join(" / ")}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <JoinCampaign />
          <Card className="p-5">
            <p className="kicker mb-2">Kurallar</p>
            <p className="text-sm text-muted">Temel kurallar, perkler, 7 ekspertiz ağacı ve augmentler.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkButton href="/kurallar" size="sm">
                Kural kitabı
              </LinkButton>
              <LinkButton href="/kurallar/yetenekler" size="sm" variant="ghost">
                Yetenek ağaçları
              </LinkButton>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
