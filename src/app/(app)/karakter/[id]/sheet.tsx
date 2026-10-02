"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BodyDiagram, WoundLegend } from "@/components/body-diagram";
import { AbilityCard, Html, PerkCard } from "@/components/content/cards";
import { Modal, Tabs, useAction, useHashTab } from "@/components/interactive";
import { Portrait, PortraitEditor } from "@/components/portrait";
import { Badge, Button, Card, Field, StatusBadge, cx } from "@/components/ui";
import type { Character, InventoryItem } from "@/db/schema";
import { api } from "@/lib/client";
import {
  BANDAGES,
  BODY_PARTS,
  CORRUPTION_EFFECTS,
  CORRUPTION_MAX,
  STAT_HINTS,
  STAT_KEYS,
  STAT_LABELS,
  STAT_MAX,
  WOUNDS,
  bodyPartLabel,
  type BodyPartKey,
} from "@/lib/shz/constants";
import type { RulesData } from "@/lib/shz/content";
import type { Ability, BranchCode } from "@/lib/shz/content-types";
import { activeSynergies, canOpenTree, effectiveStats, installedAugments, learnState, normalizeBody, woundPenalty, type CharLike } from "@/lib/shz/rules";

type Ch = Omit<Character, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };
interface Log {
  id: string;
  kind: string;
  text: string;
  createdAt: string;
  actor: string | null;
}
const TABS = ["genel", "yetenekler", "beden", "envanter", "kayit"] as const;
type Tab = (typeof TABS)[number];

export function Sheet({
  character: c,
  campaign,
  ownerName,
  isGM,
  isOwner,
  data,
  logs,
}: {
  character: Ch;
  campaign: { id: string; name: string; deathSaveEnabled: boolean; levelCap: number };
  ownerName: string;
  isGM: boolean;
  isOwner: boolean;
  data: RulesData;
  logs: Log[];
}) {
  const router = useRouter();
  const { busy, run } = useAction();
  const [tab, setTab] = useHashTab<Tab>(TABS, "genel");
  const [gmOpen, setGmOpen] = useState(false);
  const canAct = isGM || (isOwner && c.status === "ACTIVE");
  const ch: CharLike = c;
  const eff = useMemo(() => effectiveStats(ch, data), [ch, data]);
  const ds = c.deathSave;

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    const r = await run(fn, ok);
    if (r !== undefined) router.refresh();
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div className="flex min-w-0 items-start gap-5">
        {isGM || isOwner ? (
          <PortraitEditor id={c.id} version={c.portraitVersion} name={c.name} onChange={() => router.refresh()} />
        ) : (
          <Portrait id={c.id} version={c.portraitVersion} name={c.name} className="h-[150px] w-[120px]" />
        )}
        <div className="min-w-0">
          <p className="kicker mb-2">
            <Link href={`/kampanya/${campaign.id}`} className="hover:underline">
              {campaign.name}
            </Link>
          </p>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl sm:text-4xl">
            {c.name} <StatusBadge status={c.status} />
          </h1>
          <p className="mt-2 text-sm text-muted">
            {ownerName} · {c.age} yaş · {c.nationality} · {c.alignment}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.trees.map((t, i) => (
              <Badge key={t} tone="accent">
                {data.trees.find((x) => x.key === t)?.name ?? t}
                {i === 0 && " · başlangıç"}
              </Badge>
            ))}
          </div>
        </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/kampanya/${campaign.id}/oda`} className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-onAccent hover:bg-accent/90">
            Oyun odası
          </Link>
          {isGM && (
            <Button variant="outline" onClick={() => setGmOpen(true)}>
              GM düzenle
            </Button>
          )}
        </div>
      </header>

      {c.status === "PENDING" && (
        <div className="mb-6 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm">Karakter GM onayı bekliyor. Onaylanınca puan harcayabilir ve oyun odasında zar atabilirsin.</div>
      )}
      {c.status === "REJECTED" && (
        <div className="mb-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          GM bu karakteri reddetti{c.reviewNote ? `: ${c.reviewNote}` : "."} Kampanya sayfasından yeni bir karakter oluşturabilirsin.
        </div>
      )}

      {/* Kaynak şeridi */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Resource label="Seviye" value={`${c.level}`} sub={`sınır ${campaign.levelCap}`} />
        <Resource label="Yetenek puanı" value={c.abilityPoints} tone={c.abilityPoints > 0 ? "accent" : undefined} />
        <Resource label="Serbest stat" value={c.freeStatPoints} tone={c.freeStatPoints > 0 ? "accent" : undefined} />
        <Resource label="Inspiration" value={c.inspiration} tone={c.inspiration < 0 ? "danger" : undefined} sub={c.inspiration < 0 ? `her zara ${c.inspiration * 2}` : undefined} />
        <Resource
          label="Death Save"
          value={!campaign.deathSaveEnabled ? "Kapalı" : ds.available ? "Var" : "Yok"}
          sub={ds.available && (ds.deaths || ds.saves) ? `Ö ${ds.deaths} · K ${ds.saves}` : !ds.available && campaign.deathSaveEnabled ? `yenileme ${ds.resets + 1} insp.` : undefined}
          tone={campaign.deathSaveEnabled && !ds.available ? "danger" : undefined}
        />
        <Resource label="Reichsmark" value={c.money.toLocaleString("tr-TR")} />
        <Resource label="Corruption" value={`${c.corruption}/13`} tone={c.corruption >= 7 ? "danger" : c.corruption >= 4 ? "warn" : undefined} sub={c.corruptionLocked ? "7 altına inemez" : undefined} />
      </div>

      <CorruptionBar value={c.corruption} />

      {campaign.deathSaveEnabled && !ds.available && canAct && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          <span>Death Save hakkını {ds.resets + 1} Inspiration harcayarak yenileyebilirsin.</span>
          <Button size="sm" disabled={busy || c.inspiration < ds.resets + 1} onClick={() => act(() => api(`/api/characters/${c.id}/death-save`, { body: {} }), "Death Save yenilendi.")}>
            Yenile
          </Button>
        </div>
      )}

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "genel", label: "Genel" },
          { key: "yetenekler", label: "Yetenekler", badge: c.abilityPoints > 0 && canAct ? <span className="h-2 w-2 rounded-full bg-accent" /> : undefined },
          { key: "beden", label: "Beden & Augment" },
          { key: "envanter", label: "Envanter & Notlar" },
          { key: "kayit", label: "Kayıt" },
        ]}
      />

      {tab === "genel" && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg">Statlar</h2>
              {c.freeStatPoints > 0 && canAct && <Badge tone="accent">{c.freeStatPoints} serbest puan</Badge>}
            </div>
            <div className="divide-y divide-line">
              {STAT_KEYS.map((k) => {
                const e = eff[k];
                const isTree = data.trees.find((t) => t.key === c.trees[0])?.stat === k;
                return (
                  <div key={k} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <span className={cx("text-ink", isTree && "text-accent")}>{STAT_LABELS[k]}</span>
                      <span className="ml-2 text-xs text-muted">{STAT_HINTS[k]}</span>
                      {e.parts.length > 0 && (
                        <span className="block text-[11px] text-muted">
                          taban {e.base}
                          {e.parts.map((p) => ` · ${p.label} ${p.value > 0 ? "+" : ""}${p.value}`).join("")}
                          {e.capped && " · sınırlandı"}
                        </span>
                      )}
                    </div>
                    <div className="flex h-2 w-24 overflow-hidden rounded-full bg-surface2" aria-hidden>
                      <div className={cx("h-full", e.value < 0 ? "bg-danger" : "bg-accent/70")} style={{ width: `${Math.min(100, Math.abs(e.value) * 10)}%` }} />
                    </div>
                    <span className={cx("w-8 text-right font-mono text-lg", e.value < 0 && "text-danger")}>{e.value}</span>
                    {c.freeStatPoints > 0 && canAct && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-8 px-0"
                        disabled={busy || c.stats[k] >= STAT_MAX}
                        onClick={() => act(() => api(`/api/characters/${c.id}/spend-stat`, { body: { stat: k } }))}
                        title="Serbest puan harca"
                      >
                        +
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-3 font-serif text-lg">Perkler</h2>
              {c.perks.length === 0 ? (
                <p className="text-sm text-muted">Perk yok.</p>
              ) : (
                <div className="space-y-2">
                  {c.perks.map((k) => {
                    const p = data.perks.find((x) => x.key === k);
                    return p ? <PerkCard key={k} perk={p} /> : null;
                  })}
                </div>
              )}
            </Card>
            <AugmentsCard c={c} data={data} />
            {(c.background || c.appearance) && (
              <Card className="space-y-3 p-5">
                {c.background && (
                  <div>
                    <p className="kicker mb-1">Geçmiş</p>
                    <p className="whitespace-pre-line text-sm text-ink/90">{c.background}</p>
                  </div>
                )}
                {c.appearance && (
                  <div>
                    <p className="kicker mb-1">Görünüş</p>
                    <p className="whitespace-pre-line text-sm text-ink/90">{c.appearance}</p>
                  </div>
                )}
              </Card>
            )}
            <SecretNotes c={c} canEdit={isGM || isOwner} act={act} />
          </div>
        </div>
      )}

      {tab === "yetenekler" && <AbilitiesTab c={c} data={data} canAct={canAct} busy={busy} act={act} />}
      {tab === "beden" && <BodyTab c={c} data={data} isGM={isGM} act={act} />}
      {tab === "envanter" && <InventoryTab c={c} isGM={isGM} canEdit={canAct} act={act} />}
      {tab === "kayit" && (
        <Card className="divide-y divide-line">
          {logs.length === 0 && <p className="p-5 text-sm text-muted">Kayıt yok.</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-3 text-sm">
              <span className="w-36 shrink-0 font-mono text-xs text-muted">{new Date(l.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</span>
              <span className="min-w-0 flex-1">{l.text}</span>
              {l.actor && <span className="text-xs text-muted">{l.actor}</span>}
            </div>
          ))}
        </Card>
      )}

      {isGM && <GMEditor open={gmOpen} onClose={() => setGmOpen(false)} c={c} data={data} act={act} />}
    </div>
  );
}

function Resource({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "accent" | "danger" | "warn" }) {
  return (
    <div
      className={cx(
        "rounded-xl border bg-surface px-3 py-2.5",
        tone === "accent" ? "border-accent/50" : tone === "danger" ? "border-danger/50" : tone === "warn" ? "border-warn/50" : "border-line",
      )}
    >
      <p lang={/^(Inspiration|Death Save|Reichsmark|Corruption)$/.test(label) ? "en" : undefined} className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={cx("font-mono text-xl", tone === "accent" && "text-accent", tone === "danger" && "text-danger", tone === "warn" && "text-warn")}>{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

export function CorruptionBar({ value }: { value: number }) {
  return (
    <div className="mb-6">
      <div className="flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={CORRUPTION_MAX} aria-valuenow={value} aria-label="Corruption">
        {Array.from({ length: CORRUPTION_MAX + 1 }).map((_, i) => (
          <div
            key={i}
            title={`${i}: ${CORRUPTION_EFFECTS[i]}`}
            className={cx("h-2 flex-1 rounded-sm", i === 0 ? "hidden" : i <= value ? (i >= 9 ? "bg-danger" : i >= 5 ? "bg-warn" : "bg-accent") : "bg-surface2", i === 7 && "ring-1 ring-danger/50")}
          />
        ))}
      </div>
      {value > 0 && (
        <p className="mt-2 text-xs text-muted">
          <span className="text-ink">Corruption {value}:</span> {CORRUPTION_EFFECTS[value]}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ yetenekler
const COLUMN_ORDER: BranchCode[] = ["A", "A′", "B", "B′"];

function AbilitiesTab({ c, data, canAct, busy, act }: { c: Ch; data: RulesData; canAct: boolean; busy: boolean; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [showAll, setShowAll] = useState(false);
  const closed = data.trees.filter((t) => !c.trees.includes(t.key));
  return (
    <div className="space-y-10">
      {canAct && c.abilityPoints > 0 && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <strong>{c.abilityPoints}</strong> yetenek puanın var. Yeşil kenarlı yetenekleri alabilirsin; kilitli olanların altında eksik şart yazar.
        </div>
      )}
      {c.trees.map((tk) => {
        const t = data.trees.find((x) => x.key === tk);
        if (!t) return null;
        const abs = t.abilities.map((k) => data.abilities[k]);
        const root = abs.filter((a) => a.branch === "Kök");
        const cols = COLUMN_ORDER.map((code) => ({ code, list: abs.filter((a) => a.branch === code) })).filter((x) => x.list.length);
        return (
          <section key={tk}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-2xl">{t.name}</h2>
              <Badge tone="accent">{STAT_LABELS[t.stat]}</Badge>
              <span className="text-sm text-muted">{abs.filter((a) => c.abilities[a.key]).length}/8 yetenek</span>
            </div>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              {root.map((a) => (
                <AbilityTile key={a.key} a={a} c={c} data={data} canAct={canAct} busy={busy} act={act} />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {cols.map((col) => (
                <div key={col.code} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    {col.code} · {col.list[0]?.branchName}
                  </p>
                  {col.list.map((a) => (
                    <AbilityTile key={a.key} a={a} c={c} data={data} canAct={canAct} busy={busy} act={act} />
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {closed.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl">Diğer ağaçlar</h2>
            <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Gizle" : "Göster"}
            </button>
          </div>
          {showAll && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {closed.map((t) => {
                const problems = canOpenTree(c, t.key, data);
                return (
                  <Card key={t.key} className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-lg">{t.name}</span>
                      <Badge>{STAT_LABELS[t.stat]}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Link href={`/kurallar/yetenekler/${t.key}`} className="text-xs text-muted hover:text-ink">
                        Ağacı incele →
                      </Link>
                      {canAct && (
                        <Button size="sm" variant="outline" disabled={busy || problems.length > 0} title={problems.join(" · ")} onClick={() => act(() => api(`/api/characters/${c.id}/open-tree`, { body: { tree: t.key } }), `${t.name} açıldı.`)}>
                          1 puanla aç
                        </Button>
                      )}
                    </div>
                    {canAct && problems.length > 0 && <p className="mt-2 text-[11px] text-muted">{problems.join(" · ")}</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function AbilityTile({ a, c, data, canAct, busy, act }: { a: Ability; c: Ch; data: RulesData; canAct: boolean; busy: boolean; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const lv = c.abilities[a.key] ?? 0;
  const st = learnState(c, a.key, data);
  const syn = lv ? activeSynergies(c, a) : [];
  const highlight = lv ? "owned" : st.state === "available" ? "available" : "locked";
  return (
    <AbilityCard
      ability={a}
      level={lv || undefined}
      compact={!open}
      highlight={canAct || lv ? highlight : undefined}
      prereqName={a.prerequisite ? data.abilities[a.prerequisite]?.name : null}
      footer={
        <div className="space-y-2">
          {syn.length > 0 && <p className="text-[11px] text-accent">Sinerji aktif: {syn.map((k) => data.abilities[k]?.name).join(", ")}</p>}
          {st.state === "locked" && canAct && <p className="text-[11px] text-muted">{st.problems.join(" · ")}</p>}
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setOpen(!open)}>
              {open ? "Kısalt" : "Ayrıntı"}
            </button>
            {canAct && st.state === "available" && (
              <Button size="sm" variant="primary" disabled={busy} onClick={() => act(() => api(`/api/characters/${c.id}/learn`, { body: { ability: a.key } }), lv ? `${a.name} seviye ${st.nextLevel}` : `${a.name} açıldı.`)}>
                {lv ? `Sv ${st.nextLevel}'e yükselt` : "Aç (1 puan)"}
              </Button>
            )}
          </div>
        </div>
      }
    />
  );
}

// ------------------------------------------------------------------ beden
function BodyTab({ c, data, isGM, act }: { c: Ch; data: RulesData; isGM: boolean; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const body = normalizeBody(c.body);
  const [sel, setSel] = useState<BodyPartKey>("upper-torso");
  const part = body[sel];
  const augs = installedAugments(c.body, data);
  const fits = data.augments.filter((a) => a.slots.includes(sel));
  const patch = (b: Record<string, unknown>) => act(() => api(`/api/characters/${c.id}/body`, { method: "PATCH", body: { part: sel, ...b } }));
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="flex flex-col items-center gap-4 p-5">
        <BodyDiagram body={body} selected={sel} onSelect={setSel} />
        <WoundLegend />
      </Card>
      <div className="space-y-6">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg">{bodyPartLabel(sel)}</h2>
            {woundPenalty(part) > 0 && <Badge tone="danger">Zar cezası −{woundPenalty(part)}</Badge>}
          </div>
          {isGM ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Yara">
                <select className="input" value={part.wound} onChange={(e) => patch({ wound: e.target.value })}>
                  {WOUNDS.map((w) => (
                    <option key={w.key} value={w.key}>
                      {w.label} {w.penalty ? `(−${w.penalty})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sargı">
                <select className="input" value={part.bandage} disabled={part.wound === "saglam"} onChange={(e) => patch({ bandage: e.target.value })}>
                  {BANDAGES.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Augment">
                <select className="input" value={part.augment ?? ""} onChange={(e) => patch({ augment: e.target.value || null })}>
                  <option value="">Yok</option>
                  {fits.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.tier} · {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Not">
                <input className="input" defaultValue={part.note} maxLength={200} key={sel} onBlur={(e) => e.target.value !== part.note && patch({ note: e.target.value })} />
              </Field>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted">Yara</dt>
              <dd>{WOUNDS.find((w) => w.key === part.wound)?.label}</dd>
              <dt className="text-muted">Sargı</dt>
              <dd>{BANDAGES.find((b) => b.key === part.bandage)?.label}</dd>
              <dt className="text-muted">Augment</dt>
              <dd>{data.augments.find((a) => a.key === part.augment)?.name ?? "Yok"}</dd>
              {part.note && (
                <>
                  <dt className="text-muted">Not</dt>
                  <dd>{part.note}</dd>
                </>
              )}
            </dl>
          )}
        </Card>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface2/60 text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Uzuv</th>
                <th className="px-4 py-2.5 font-medium">Durum</th>
                <th className="px-4 py-2.5 font-medium">Ceza</th>
                <th className="px-4 py-2.5 font-medium">Augment</th>
              </tr>
            </thead>
            <tbody>
              {BODY_PARTS.map((p) => {
                const s = body[p.key];
                const pen = woundPenalty(s);
                return (
                  <tr key={p.key} onClick={() => setSel(p.key)} className={cx("cursor-pointer border-b border-line/50 last:border-0 hover:bg-surface2/50", sel === p.key && "bg-accent/5")}>
                    <td className="px-4 py-2">{p.label}</td>
                    <td className="px-4 py-2">
                      {WOUNDS.find((w) => w.key === s.wound)?.label}
                      {s.bandage !== "yok" && <span className="text-xs text-muted"> · {BANDAGES.find((b) => b.key === s.bandage)?.label}</span>}
                    </td>
                    <td className={cx("px-4 py-2 font-mono", pen > 0 && "text-danger")}>{pen ? `−${pen}` : "—"}</td>
                    <td className="px-4 py-2 text-accent">{data.augments.find((a) => a.key === s.augment)?.name ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        {augs.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {augs.map(({ part: p, augment }) => (
              <Card key={p} className="p-4">
                <p className="kicker mb-1">{bodyPartLabel(p)}</p>
                <p className="font-serif text-lg">{augment.name}</p>
                <Html html={augment.usageHtml} className="mt-2 text-sm" />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ envanter
function InventoryTab({ c, isGM, canEdit, act }: { c: Ch; isGM: boolean; canEdit: boolean; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [items, setItems] = useState<InventoryItem[]>(c.inventory);
  const [money, setMoney] = useState(c.money);
  const [notes, setNotes] = useState(c.notes);
  const [gmNotes, setGmNotes] = useState(c.gmNotes);
  const dirty = JSON.stringify(items) !== JSON.stringify(c.inventory) || money !== c.money || notes !== c.notes;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg">Envanter</h2>
          {canEdit && (
            <Button size="sm" onClick={() => setItems([...items, { id: Math.random().toString(36).slice(2, 10), name: "", qty: 1, note: "" }])}>
              Eşya ekle
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted">Envanter boş.</p>}
          {items.map((it, i) => (
            <div key={it.id} className="grid grid-cols-[1fr_64px_1fr_auto] gap-2">
              <input className="input" placeholder="Eşya" value={it.name} disabled={!canEdit} maxLength={80} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input" type="number" min={0} max={9999} value={it.qty} disabled={!canEdit} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
              <input className="input" placeholder="Not" value={it.note} disabled={!canEdit} maxLength={200} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
              {canEdit && (
                <button type="button" className="px-2 text-muted hover:text-danger" aria-label="Sil" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 max-w-xs">
          <Field label="Reichsmark">
            <input className="input" type="number" value={money} disabled={!canEdit} onChange={(e) => setMoney(Number(e.target.value))} />
          </Field>
        </div>
      </Card>
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-3 font-serif text-lg">Notlar</h2>
          <textarea className="input min-h-[180px]" value={notes} disabled={!canEdit} maxLength={8000} onChange={(e) => setNotes(e.target.value)} />
        </Card>
        {isGM && (
          <Card className="border-accent/30 p-5">
            <h2 className="mb-1 font-serif text-lg">GM notları</h2>
            <p className="mb-3 text-xs text-muted">Oyuncu bunu görmez.</p>
            <textarea className="input min-h-[120px]" value={gmNotes} maxLength={8000} onChange={(e) => setGmNotes(e.target.value)} />
            <Button size="sm" className="mt-3" disabled={gmNotes === c.gmNotes} onClick={() => act(() => api(`/api/characters/${c.id}/gm`, { method: "PATCH", body: { gmNotes } }), "GM notu kaydedildi.")}>
              GM notunu kaydet
            </Button>
          </Card>
        )}
        {canEdit && (
          <Button
            variant="primary"
            disabled={!dirty || items.some((x) => !x.name.trim())}
            onClick={() => act(() => api(`/api/characters/${c.id}/sheet`, { method: "PATCH", body: { inventory: items, money, notes } }), "Kaydedildi.")}
          >
            Envanter ve notları kaydet
          </Button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ GM düzenleyici
function GMEditor({ open, onClose, c, data, act }: { open: boolean; onClose: () => void; c: Ch; data: RulesData; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [v, setV] = useState({
    level: c.level,
    abilityPoints: c.abilityPoints,
    freeStatPoints: c.freeStatPoints,
    corruption: c.corruption,
    corruptionLocked: c.corruptionLocked,
    inspiration: c.inspiration,
    status: c.status,
    stats: { ...c.stats },
    deathAvailable: c.deathSave.available,
    reason: "",
  });
  const num = (k: "level" | "abilityPoints" | "freeStatPoints" | "corruption" | "inspiration", min: number, max: number) => (
    <Field lang={k === "corruption" || k === "inspiration" ? "en" : undefined} label={{ level: "Seviye", abilityPoints: "Yetenek puanı", freeStatPoints: "Serbest stat", corruption: "Corruption", inspiration: "Inspiration" }[k]}>
      <input type="number" className="input" min={min} max={max} value={v[k]} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} />
    </Field>
  );
  return (
    <Modal open={open} onClose={onClose} title="GM düzenle" wide>
      <div className="space-y-5">
        <p className="text-sm text-muted">Her değişiklik karakterin kaydına yazılır. Yetenek ve ağaç düzeltmeleri için kural kitabındaki önkoşullar uygulanmaz.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {num("level", 0, 15)}
          {num("abilityPoints", 0, 50)}
          {num("freeStatPoints", 0, 50)}
          {num("corruption", 0, 13)}
          {num("inspiration", -20, 50)}
        </div>
        <div className="flex flex-wrap gap-4">
          <Field label="Durum">
            <select className="input" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as Ch["status"] })}>
              <option value="ACTIVE">Aktif</option>
              <option value="PENDING">Onay bekliyor</option>
              <option value="REJECTED">Reddedildi</option>
              <option value="DEAD">Öldü</option>
              <option value="RETIRED">Emekli</option>
            </select>
          </Field>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.corruptionLocked} onChange={(e) => setV({ ...v, corruptionLocked: e.target.checked })} className="h-4 w-4 accent-[rgb(186,168,240)]" />
            Corruption 7 kilidi
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.deathAvailable} onChange={(e) => setV({ ...v, deathAvailable: e.target.checked })} className="h-4 w-4 accent-[rgb(186,168,240)]" />
            Death Save hakkı var
          </label>
        </div>
        <div>
          <span className="label">Ham statlar (augment ve corruption hariç)</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STAT_KEYS.map((k) => (
              <label key={k} className="block">
                <span className="text-[11px] text-muted">{STAT_LABELS[k]}</span>
                <input
                  type="number"
                  className="input py-1.5"
                  min={k === "klang" ? -20 : 0}
                  max={10}
                  value={v.stats[k]}
                  onChange={(e) => setV({ ...v, stats: { ...v.stats, [k]: Number(e.target.value) } })}
                />
              </label>
            ))}
          </div>
        </div>
        <Field label="Gerekçe (kayda yazılır)">
          <input className="input" maxLength={200} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} placeholder="ör. Pervitin kullanımı, oturum ödülü" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Vazgeç</Button>
          <Button
            variant="primary"
            onClick={async () => {
              await act(
                () =>
                  api(`/api/characters/${c.id}/gm`, {
                    method: "PATCH",
                    body: {
                      level: v.level,
                      abilityPoints: v.abilityPoints,
                      freeStatPoints: v.freeStatPoints,
                      corruption: v.corruption,
                      corruptionLocked: v.corruptionLocked,
                      inspiration: v.inspiration,
                      status: v.status,
                      stats: v.stats,
                      deathSave: { available: v.deathAvailable, resets: c.deathSave.resets },
                      reason: v.reason || undefined,
                    },
                  }),
                "Karakter güncellendi.",
              );
              onClose();
            }}
          >
            Kaydet
          </Button>
        </div>
        <details className="rounded-lg border border-line p-3 text-sm">
          <summary className="cursor-pointer text-muted">Yetenek / ağaç / perk düzeltmesi</summary>
          <GMLists c={c} data={data} act={act} />
        </details>
      </div>
    </Modal>
  );
}

function GMLists({ c, data, act }: { c: Ch; data: RulesData; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [trees, setTrees] = useState<string[]>(c.trees);
  const [abilities, setAbilities] = useState<Record<string, number>>(c.abilities);
  const [perks, setPerks] = useState<string[]>(c.perks);
  return (
    <div className="mt-3 space-y-4">
      <div>
        <span className="label">Ağaçlar (en fazla 2, ilki başlangıç)</span>
        <div className="flex flex-wrap gap-2">
          {data.trees.map((t) => (
            <label key={t.key} className="chip cursor-pointer">
              <input
                type="checkbox"
                checked={trees.includes(t.key)}
                onChange={(e) => setTrees(e.target.checked ? [...trees, t.key].slice(0, 2) : trees.filter((x) => x !== t.key))}
              />
              {t.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Yetenek seviyeleri</span>
        <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
          {trees.flatMap((tk) =>
            (data.trees.find((t) => t.key === tk)?.abilities ?? []).map((k) => {
              const a = data.abilities[k];
              return (
                <label key={k} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-surface2">
                  <span className="truncate">{a.name}</span>
                  <select className="input h-7 w-16 py-0 text-xs" value={abilities[k] ?? 0} onChange={(e) => setAbilities({ ...abilities, [k]: Number(e.target.value) })}>
                    {Array.from({ length: a.maxLevel + 1 }).map((_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }),
          )}
        </div>
      </div>
      <div>
        <span className="label">Perkler</span>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {data.perks.map((p) => (
            <label key={p.key} className={cx("chip cursor-pointer", perks.includes(p.key) && "border-accent text-accent")}>
              <input type="checkbox" className="hidden" checked={perks.includes(p.key)} onChange={(e) => setPerks(e.target.checked ? [...perks, p.key] : perks.filter((x) => x !== p.key))} />
              {p.kind === "positive" ? "−" : "+"}
              {p.points} {p.name}
            </label>
          ))}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={() => act(() => api(`/api/characters/${c.id}/gm`, { method: "PATCH", body: { trees, abilities, perks } }), "Listeler güncellendi.")}>
        Listeleri kaydet
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------ augmentler (genel)
function AugmentsCard({ c, data }: { c: Ch; data: RulesData }) {
  const augs = installedAugments(c.body, data);
  return (
    <Card className="p-5">
      <h2 className="mb-3 font-serif text-lg">Takılı augmentler</h2>
      {augs.length === 0 ? (
        <p className="text-sm text-muted">Takılı augment yok.</p>
      ) : (
        <div className="space-y-3">
          {augs.map(({ part, augment: a }) => (
            <div key={part} className="rounded-lg border border-line bg-surface2/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-serif text-base text-ink">{a.name}</span>
                {a.tier && <Badge tone={a.tier === "T3" ? "danger" : a.tier === "T2" ? "warn" : "accent"}>{a.tier}</Badge>}
                <span className="text-xs text-muted">{bodyPartLabel(part)}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {a.mods.map((m) => (
                  <span key={m.stat} className={cx("rounded px-1.5 py-0.5 font-mono text-[11px]", m.value > 0 ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger")}>
                    {m.value > 0 ? "+" : "−"}
                    {Math.abs(m.value)} {STAT_LABELS[m.stat]}
                  </span>
                ))}
              </div>
              {a.usageHtml && <Html html={a.usageHtml} className="mt-2 text-sm" />}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ gizli notlar
function SecretNotes({ c, canEdit, act }: { c: Ch; canEdit: boolean; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [v, setV] = useState(c.secretNotes);
  if (!canEdit) return null;
  return (
    <Card className="border-accent/30 p-5">
      <h2 className="font-serif text-lg">GM&apos;e özel notlar ve gizli geçmiş</h2>
      <p className="mb-3 text-xs text-muted">Yalnızca sen ve GM görürsünüz. Diğer oyuncular bu alanı göremez.</p>
      <textarea className="input min-h-[120px]" value={v} maxLength={6000} onChange={(e) => setV(e.target.value)} placeholder="Sırlar, gizli bağlantılar, GM'den istediğin hikâye kancaları…" />
      <Button size="sm" className="mt-3" disabled={v === c.secretNotes} onClick={() => act(() => api(`/api/characters/${c.id}/sheet`, { method: "PATCH", body: { secretNotes: v } }), "Kaydedildi.")}>
        Kaydet
      </Button>
    </Card>
  );
}
