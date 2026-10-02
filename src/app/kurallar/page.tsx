import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { STAT_LABELS } from "@/lib/shz/constants";
import { content } from "@/lib/shz/content";

export const metadata: Metadata = { title: "Kurallar" };

export default function RulesIndex() {
  const c = content();
  const cards = [
    ...c.docs.map((d) => ({ href: `/kurallar/${d.key}`, title: d.title, text: "Temel kural metni" })),
    { href: "/kurallar/perkler", title: "Perkler", text: `${c.perks.filter((p) => p.kind === "positive").length} pozitif · ${c.perks.filter((p) => p.kind === "negative").length} negatif` },
    { href: "/kurallar/augmentler", title: "Augmentasyonlar", text: `${c.augments.length} örnek augment` },
    { href: "/kurallar/kampanyalar", title: "Kampanyalar", text: `${c.campaigns.length} kampanya` },
  ];
  return (
    <div>
      <PageHeader kicker="SHZ-TTRPG" title="Oyuncu Kural Kitabı">
        Temel mekanikler, karakter yaratma, perkler, ekspertiz ağaçları ve augmentasyonlar. İçerik doğrudan GM&apos;in kural dosyalarından üretilir.
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((x) => (
          <Link key={x.href} href={x.href} className="card p-5 transition hover:border-accent/40">
            <p className="font-serif text-lg text-ink">{x.title}</p>
            <p className="mt-1 text-sm text-muted">{x.text}</p>
          </Link>
        ))}
      </div>
      <h2 className="mb-3 mt-10 text-xl">Ekspertiz ağaçları</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {c.trees.map((t) => (
          <Link key={t.key} href={`/kurallar/yetenekler/${t.key}`} className="card p-4 transition hover:border-accent/40">
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg">{t.name}</span>
              <Badge tone="accent">{STAT_LABELS[t.stat]}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted">{t.startBonusText}</p>
          </Link>
        ))}
      </div>
      <p className="mt-10 text-xs text-muted">Sürüm {c.hash} · {new Date(c.generatedAt).toLocaleDateString("tr-TR")}</p>
    </div>
  );
}
