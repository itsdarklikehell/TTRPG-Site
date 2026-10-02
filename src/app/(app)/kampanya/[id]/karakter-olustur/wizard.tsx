"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AbilityCard, AugmentCard, Html, PerkCard } from "@/components/content/cards";
import { useAction } from "@/components/interactive";
import { Badge, Button, Card, Field, cx } from "@/components/ui";
import { api } from "@/lib/client";
import { AGE_MAX, AGE_MIN, STAT_HINTS, STAT_KEYS, STAT_LABELS, bodyPartLabel, type StatKey } from "@/lib/shz/constants";
import type { RulesData } from "@/lib/shz/content";
import { buildCreation, emptyStats, learnState, type Stats } from "@/lib/shz/rules";

const STEPS = ["Kimlik", "Ekspertiz", "Perkler", "Statlar", "İlk yetenek", "Özet"] as const;

interface Identity {
  name: string;
  age: number;
  nationality: string;
  alignment: string;
  background: string;
  appearance: string;
}

export function Wizard({ campaignId, startPerkPoints, data }: { campaignId: string; startPerkPoints: number; data: RulesData }) {
  const router = useRouter();
  const { busy, run } = useAction();
  const [step, setStep] = useState(0);
  const [id, setId] = useState<Identity>({ name: "", age: 30, nationality: "", alignment: "", background: "", appearance: "" });
  const [tree, setTree] = useState("");
  const [aug, setAug] = useState<{ key: string; part: string } | null>(null);
  const [perks, setPerks] = useState<string[]>([]);
  const [free, setFree] = useState<Partial<Stats>>({});
  const [perkStats, setPerkStats] = useState<Partial<Stats>>({});
  const [first, setFirst] = useState<string | null>(null);
  const [perkFilter, setPerkFilter] = useState("");

  const T = data.trees.find((t) => t.key === tree);
  const result = useMemo(
    () => buildCreation({ tree, freeStats: free, perks, perkStats, startAugment: aug, firstAbility: first }, startPerkPoints, data),
    [tree, free, perks, perkStats, aug, first, startPerkPoints, data],
  );
  const budget = result.budget;
  const freeUsed = Object.values(free).reduce((a, b) => a + (b ?? 0), 0);
  const perkUsed = Object.values(perkStats).reduce((a, b) => a + (b ?? 0), 0);

  const idOk = id.name.trim().length >= 2 && id.nationality.trim().length >= 2 && id.alignment.trim().length >= 2 && id.age >= AGE_MIN && id.age <= AGE_MAX;
  const stepOk = [
    idOk,
    !!T && (T.startBonus.kind !== "augment" || !!aug),
    budget.problems.length === 0,
    freeUsed === 2 && perkUsed === budget.convertible,
    true,
    result.ok && idOk,
  ];

  // Perk seçimi değişince dönüşen puan dağılımını sıfırla (fazla kalmasın).
  const togglePerk = (k: string) => {
    setPerks((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
    setPerkStats({});
    setFirst(null);
  };
  const chooseTree = (k: string) => {
    setTree(k);
    setAug(null);
    setFree({});
    setFirst(null);
  };

  const baseStats = useMemo(() => {
    const s = emptyStats();
    s.klang = 2;
    if (T) {
      s[T.stat] += 2;
      if (T.startBonus.kind === "stat") s[T.startBonus.stat] += T.startBonus.amount;
    }
    return s;
  }, [T]);

  const charForAbilities = {
    level: 0,
    stats: result.stats,
    trees: tree ? [tree] : [],
    abilities: {},
    perks,
    body: result.body,
    corruption: result.corruption,
    inspiration: 0,
    abilityPoints: 1,
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <ol className="mb-6 flex gap-1 overflow-x-auto">
          {STEPS.map((s, i) => (
            <li key={s} className="shrink-0">
              <button
                type="button"
                onClick={() => i <= step || stepOk.slice(0, i).every(Boolean) ? setStep(i) : undefined}
                className={cx(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                  i === step ? "border-accent bg-accent/15 text-ink" : stepOk[i] && i < step ? "border-ok/40 text-ok" : "border-line text-muted",
                )}
              >
                <span className="font-mono">{i + 1}</span> {s}
              </button>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <Card className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Karakter adı" hint="Milliyetine uygun bir isim seçmek iyi olur">
                <input className="input" value={id.name} maxLength={60} onChange={(e) => setId({ ...id, name: e.target.value })} />
              </Field>
              <Field label="Yaş" hint={`${AGE_MIN}–${AGE_MAX} arası`}>
                <input type="number" min={AGE_MIN} max={AGE_MAX} className="input" value={id.age} onChange={(e) => setId({ ...id, age: Number(e.target.value) })} />
              </Field>
              <Field label="Milliyet" hint="Irk ve milliyet RP içinde iletişimi etkileyebilir">
                <input className="input" value={id.nationality} maxLength={60} onChange={(e) => setId({ ...id, nationality: e.target.value })} />
              </Field>
              <Field label="Alignment / taraf" hint="Karakterin genel faction bilgisi">
                <input className="input" value={id.alignment} maxLength={60} onChange={(e) => setId({ ...id, alignment: e.target.value })} />
              </Field>
            </div>
            <Field label="Geçmiş" hint="Kısa bir hikâye: nereden geliyor, ne istiyor?">
              <textarea className="input" rows={5} maxLength={4000} value={id.background} onChange={(e) => setId({ ...id, background: e.target.value })} />
            </Field>
            <Field label="Görünüş">
              <textarea className="input" rows={2} maxLength={1000} value={id.appearance} onChange={(e) => setId({ ...id, appearance: e.target.value })} />
            </Field>
          </Card>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Başlangıç ekspertiz ağacın, sembol stat'ına <strong className="text-ink">+2</strong> verir ve ağacın kendi başlangıç bonusunu kazandırır. İkinci ağacı oyun içinde yetenek
              puanıyla açabilirsin.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.trees.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => chooseTree(t.key)}
                  className={cx("card p-4 text-left transition", tree === t.key ? "border-accent bg-accent/[0.08]" : "hover:border-accent/40")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-lg text-ink">{t.name}</span>
                    <Badge tone="accent">{STAT_LABELS[t.stat]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{t.startBonusText}</p>
                </button>
              ))}
            </div>
            {T?.startBonus.kind === "augment" && (
              <Card className="p-5">
                <p className="kicker mb-3">Başlangıç augment&apos;i ({T.startBonus.tier})</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {data.augments
                    .filter((a) => a.tier === (T.startBonus as { tier: string }).tier)
                    .map((a) => (
                      <AugmentCard
                        key={a.key}
                        augment={a}
                        action={
                          <div className="flex flex-wrap gap-1.5">
                            {a.slots.map((s) => (
                              <Button key={s} size="sm" variant={aug?.key === a.key && aug.part === s ? "primary" : "secondary"} onClick={() => setAug({ key: a.key, part: s })}>
                                {bodyPartLabel(s)}
                              </Button>
                            ))}
                          </div>
                        }
                      />
                    ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
              <span>
                Başlangıç <strong className="font-mono">+{budget.start}</strong>
              </span>
              <span>
                Negatiflerden <strong className="font-mono text-ok">+{budget.gained}</strong>
              </span>
              <span>
                Pozitiflere <strong className="font-mono text-danger">−{budget.spent}</strong>
              </span>
              <span className={cx("ml-auto rounded-md px-2 py-1 font-mono", budget.left < 0 ? "bg-danger/15 text-danger" : "bg-accent/15 text-accent")}>Kalan {budget.left}</span>
              <span className="w-full text-xs text-muted">
                Toplam puan negatife düşmeden istediğin kadar perk alabilirsin. Artan puan (Puan + 1) / 2 olarak stat puanına dönüşür: şu an <strong>{budget.convertible}</strong>.
              </span>
            </Card>
            <input className="input" placeholder="Perk ara…" value={perkFilter} onChange={(e) => setPerkFilter(e.target.value)} />
            {(["positive", "negative"] as const).map((kind) => (
              <section key={kind}>
                <h3 className="mb-2 mt-4 font-serif text-lg">{kind === "positive" ? "Pozitif perkler" : "Negatif perkler"}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {data.perks
                    .filter((p) => p.kind === kind && (!perkFilter || p.searchText.includes(perkFilter.toLocaleLowerCase("tr-TR"))))
                    .map((p) => {
                      const on = perks.includes(p.key);
                      const blockedBy = p.exclusive.find((x) => perks.includes(x));
                      return (
                        <PerkCard
                          key={p.key}
                          perk={p}
                          selected={on}
                          disabled={!!blockedBy && !on}
                          action={
                            <Button size="sm" variant={on ? "primary" : "secondary"} disabled={!!blockedBy && !on} onClick={() => togglePerk(p.key)} title={blockedBy ? "Seçili bir perkle birlikte alınamaz" : undefined}>
                              {on ? "Seçildi" : "Seç"}
                            </Button>
                          }
                        />
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        )}

        {step === 3 && (
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <Badge tone={freeUsed === 2 ? "ok" : "accent"}>Serbest puan: {freeUsed}/2</Badge>
              <Badge tone={perkUsed === budget.convertible ? "ok" : "accent"}>
                Perk&apos;ten dönüşen: {perkUsed}/{budget.convertible}
              </Badge>
            </div>
            <p className="mb-4 text-sm text-muted">
              Serbest 2 puan ağaç stat&apos;ın ({T ? STAT_LABELS[T.stat] : "—"}) dışındaki statlara verilir. Perk&apos;ten dönüşen puanlar herhangi bir stat&apos;a verilebilir. Klang herkese +2
              başlar.
            </p>
            <div className="divide-y divide-line">
              {STAT_KEYS.map((k) => {
                const isTree = T?.stat === k;
                return (
                  <div key={k} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2.5">
                    <div>
                      <span className="text-ink">{STAT_LABELS[k]}</span>
                      {isTree && <Badge tone="accent" className="ml-2">Ağaç</Badge>}
                      <span className="block text-xs text-muted">{STAT_HINTS[k]}</span>
                    </div>
                    <Stepper
                      label="Serbest"
                      value={free[k] ?? 0}
                      canInc={!isTree && freeUsed < 2}
                      onChange={(v) => setFree((f) => ({ ...f, [k]: v }))}
                    />
                    <Stepper
                      label="Perk"
                      value={perkStats[k] ?? 0}
                      canInc={perkUsed < budget.convertible}
                      onChange={(v) => setPerkStats((f) => ({ ...f, [k]: v }))}
                    />
                    <span className="w-10 text-right font-mono text-lg text-ink" title={`Taban ${baseStats[k]}`}>
                      {result.stats[k]}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Seviye 0&apos;da 1 yetenek puanın var. Şartlarını karşıladığın bir yeteneği şimdi alabilir ya da puanı saklayıp oyun içinde harcayabilirsin.
            </p>
            <Button variant={first === null ? "primary" : "secondary"} onClick={() => setFirst(null)}>
              Şimdi seçme, puanı sakla
            </Button>
            <div className="grid gap-3 md:grid-cols-2">
              {T?.abilities.map((k) => {
                const a = data.abilities[k];
                const st = learnState(charForAbilities, k, data);
                const ok = st.state === "available";
                return (
                  <AbilityCard
                    key={k}
                    ability={a}
                    compact={!ok}
                    highlight={first === k ? "owned" : ok ? "available" : "locked"}
                    prereqName={a.prerequisite ? data.abilities[a.prerequisite]?.name : null}
                    footer={
                      ok ? (
                        <Button size="sm" variant={first === k ? "primary" : "outline"} onClick={() => setFirst(k)}>
                          {first === k ? "Seçildi" : "Bunu al"}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted">Kilitli: {st.state === "locked" ? st.problems.join(" · ") : ""}</p>
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <Card className="space-y-5 p-6">
            <div>
              <p className="kicker mb-1">Kimlik</p>
              <p className="font-serif text-2xl">{id.name || "—"}</p>
              <p className="text-sm text-muted">
                {id.age} yaş · {id.nationality} · {id.alignment}
              </p>
            </div>
            <div>
              <p className="kicker mb-1">Ekspertiz</p>
              <p>
                {T?.name} <span className="text-muted">({T && STAT_LABELS[T.stat]})</span>
                {aug && ` · Augment: ${data.augments.find((a) => a.key === aug.key)?.name} (${bodyPartLabel(aug.part)})`}
              </p>
              {T && <Html html={T.introHtml} className="mt-1 text-sm text-muted" />}
            </div>
            <div>
              <p className="kicker mb-1">Perkler</p>
              <p className="text-sm">{perks.map((k) => data.perks.find((p) => p.key === k)?.name).join(", ") || "Yok"}</p>
            </div>
            <div>
              <p className="kicker mb-1">İlk yetenek</p>
              <p className="text-sm">{first ? data.abilities[first].name : "Seçilmedi (1 yetenek puanı saklanacak)"}</p>
            </div>
            {!result.ok && (
              <ul className="list-disc space-y-1 rounded-lg border border-danger/40 bg-danger/10 py-3 pl-8 pr-4 text-sm text-danger">
                {result.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <Button
              variant="primary"
              size="lg"
              disabled={!result.ok || !idOk || busy}
              onClick={async () => {
                const r = await run(() =>
                  api<{ id: string }>("/api/characters", {
                    body: {
                      campaignId,
                      ...id,
                      creation: { tree, freeStats: free, perks, perkStats, startAugment: aug, firstAbility: first },
                    },
                  }),
                );
                if (r) router.push(`/karakter/${r.id}`);
              }}
            >
              Karakteri onaya gönder
            </Button>
          </Card>
        )}

        <div className="mt-6 flex justify-between">
          <Button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            ← Geri
          </Button>
          {step < STEPS.length - 1 && (
            <Button variant="primary" disabled={!stepOk[step]} onClick={() => setStep((s) => s + 1)}>
              İleri →
            </Button>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <p className="kicker mb-3">Özet</p>
          <p className="font-serif text-lg">{id.name || "İsimsiz"}</p>
          <p className="mb-4 text-xs text-muted">
            Seviye 0 · {T?.name ?? "ağaç seçilmedi"} · Corruption {result.corruption}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {STAT_KEYS.map((k) => (
              <div key={k} className="flex justify-between border-b border-line/50 py-1">
                <span className={cx(T?.stat === k ? "text-accent" : "text-muted")}>{STAT_LABELS[k]}</span>
                <span className="font-mono">{result.stats[k]}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm">
            <span className="text-muted">Perk puanı: </span>
            <span className={cx("font-mono", budget.left < 0 && "text-danger")}>{budget.left}</span>
            <span className="text-muted"> → stat: </span>
            <span className="font-mono">{budget.convertible}</span>
          </div>
          {result.problems.length > 0 && step > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-warn">
              {result.problems.slice(0, 5).map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  );
}

function Stepper({ label, value, onChange, canInc }: { label: string; value: number; onChange: (v: number) => void; canInc: boolean }) {
  return (
    <div className="flex items-center gap-1" title={label}>
      <span className="mr-1 hidden text-[10px] uppercase tracking-wider text-muted sm:inline">{label}</span>
      <button type="button" className="h-7 w-7 rounded-md border border-line text-muted hover:text-ink disabled:opacity-30" disabled={value <= 0} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="w-5 text-center font-mono text-sm">{value}</span>
      <button type="button" className="h-7 w-7 rounded-md border border-line text-muted hover:text-ink disabled:opacity-30" disabled={!canInc} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

