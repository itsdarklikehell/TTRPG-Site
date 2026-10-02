import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AbilityCard, Html } from "@/components/content/cards";
import { Badge, PageHeader } from "@/components/ui";
import { STAT_LABELS } from "@/lib/shz/constants";
import { content } from "@/lib/shz/content";
import type { BranchCode } from "@/lib/shz/content-types";

export async function generateMetadata({ params }: { params: Promise<{ tree: string }> }): Promise<Metadata> {
  const { tree } = await params;
  return { title: content().trees.find((t) => t.key === tree)?.name ?? "Yetenekler" };
}

const ORDER: BranchCode[] = ["A", "A′", "B", "B′"];

export default async function TreePage({ params }: { params: Promise<{ tree: string }> }) {
  const { tree } = await params;
  const c = content();
  const t = c.trees.find((x) => x.key === tree);
  if (!t) notFound();
  const abs = t.abilities.map((k) => c.abilities[k]);
  const cols = ORDER.map((code) => ({ code, list: abs.filter((a) => a.branch === code) })).filter((x) => x.list.length);
  const pre = (k: string | null) => (k ? c.abilities[k]?.name : null);
  return (
    <div>
      <PageHeader kicker="Ekspertiz ağacı" title={t.name} actions={<Badge tone="accent">{STAT_LABELS[t.stat]}</Badge>}>
        <Html html={t.introHtml} />
      </PageHeader>
      <section className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Kök</p>
        <div className="grid gap-3 md:grid-cols-2">
          {abs
            .filter((a) => a.branch === "Kök")
            .map((a) => (
              <AbilityCard key={a.key} ability={a} />
            ))}
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        {cols.map((col) => (
          <section key={col.code}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
              Kol {col.code} · {col.list[0].branchName}
            </p>
            <div className="space-y-3">
              {col.list.map((a) => (
                <AbilityCard key={a.key} ability={a} prereqName={pre(a.prerequisite)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
