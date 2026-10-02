import type { Metadata } from "next";
import { Html } from "@/components/content/cards";
import { Badge, PageHeader } from "@/components/ui";
import { content } from "@/lib/shz/content";

export const metadata: Metadata = { title: "Kampanyalar" };

export default function CampaignsPage() {
  return (
    <div>
      <PageHeader kicker="1955" title="Kampanyalar">
        Alman iç savaşının farklı cephelerinden sekiz hikâye.
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {content().campaigns.map((c) => (
          <article key={c.key} className="card flex gap-4 p-5">
            {c.emblem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/schwarzesonne${c.emblem}`} alt="" className="h-16 w-16 shrink-0 object-contain" />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-surface2 text-2xl">☀️</div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg">{c.name}</h2>
              <div className="mb-2 mt-1 flex flex-wrap gap-1.5">
                <Badge tone={/UBER|HARSH/.test(c.difficulty) ? "danger" : /MODERATE/.test(c.difficulty) ? "warn" : "ok"}>{c.difficulty}</Badge>
                <Badge>{c.length}</Badge>
              </div>
              <Html html={c.storyHtml} className="text-sm text-ink/85" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
