// Schwarzesonne kural motoru. Saf fonksiyonlardır; hem sunucuda (doğrulama)
// hem istemcide (önizleme) aynı sonuçları verir. İçerik parametre olarak gelir.
import {
  ABILITY_LEVEL3_MIN_CHAR_LEVEL,
  BODY_PARTS,
  CORRUPTION_LOCK,
  CORRUPTION_MAX,
  INSPIRATION_DEBT_PENALTY,
  MAX_TREES,
  START_FREE_STATS,
  START_KLANG,
  START_TREE_STAT,
  STAT_KEYS,
  STAT_LABELS,
  STAT_MAX,
  WOUNDS,
  bodyPartLabel,
  type BandageKey,
  type BodyPartKey,
  type StatKey,
  type WoundKey,
} from "./constants";
import type { Ability, Augment, Perk, Requirement, Tree } from "./content-types";

export type Stats = Record<StatKey, number>;
export interface PartState {
  wound: WoundKey;
  bandage: BandageKey;
  augment: string | null;
  note: string;
}
export type BodyState = Partial<Record<string, PartState>>;

export interface RulesInput {
  trees: Tree[];
  abilities: Record<string, Ability>;
  perks: Perk[];
  augments: Augment[];
}

/** Kural hesapları için gereken karakter alanları. */
export interface CharLike {
  level: number;
  stats: Stats;
  trees: string[];
  abilities: Record<string, number>;
  perks: string[];
  body: BodyState;
  corruption: number;
  inspiration: number;
  abilityPoints: number;
}

export function emptyStats(): Stats {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Stats;
}

export function defaultPart(): PartState {
  return { wound: "saglam", bandage: "yok", augment: null, note: "" };
}
export function normalizeBody(body: BodyState | null | undefined): Record<BodyPartKey, PartState> {
  const out = {} as Record<BodyPartKey, PartState>;
  for (const p of BODY_PARTS) out[p.key] = { ...defaultPart(), ...(body?.[p.key] ?? {}) };
  return out;
}

// ------------------------------------------------------------------ statlar
export interface StatBreakdown {
  base: number;
  value: number;
  parts: { label: string; value: number }[];
  capped: boolean;
}

export function installedAugments(body: BodyState, data: Pick<RulesInput, "augments">) {
  const out: { part: BodyPartKey; augment: Augment }[] = [];
  for (const p of BODY_PARTS) {
    const k = body?.[p.key]?.augment;
    if (!k) continue;
    const a = data.augments.find((x) => x.key === k);
    if (a) out.push({ part: p.key, augment: a });
  }
  return out;
}

export function corruptionKlangBonus(corruption: number) {
  return Math.max(0, corruption - 2);
}

/** Augment etkileri ve Corruption bonusu eklenmiş, sınırlandırılmış stat değerleri. */
export function effectiveStats(c: Pick<CharLike, "stats" | "body" | "corruption">, data: Pick<RulesInput, "augments">) {
  const out = {} as Record<StatKey, StatBreakdown>;
  const augs = installedAugments(c.body, data);
  for (const k of STAT_KEYS) {
    const base = c.stats?.[k] ?? 0;
    const parts: { label: string; value: number }[] = [];
    for (const { augment } of augs) for (const m of augment.mods) if (m.stat === k) parts.push({ label: augment.name, value: m.value });
    if (k === "klang") {
      const b = corruptionKlangBonus(c.corruption);
      if (b) parts.push({ label: "Corruption", value: b });
    }
    const raw = base + parts.reduce((s, p) => s + p.value, 0);
    let value = Math.min(STAT_MAX, raw);
    if (k !== "klang") value = Math.max(0, value);
    out[k] = { base, value, parts, capped: value !== raw };
  }
  return out;
}

// ------------------------------------------------------------------ beden
export function woundPenalty(part: Pick<PartState, "wound" | "bandage">): number {
  const w = WOUNDS.find((x) => x.key === part.wound)?.penalty ?? 0;
  if (!w) return 0;
  if (part.bandage === "temiz") return Math.floor(w / 2);
  if (part.bandage === "kirli") return Math.floor((w * 3) / 4);
  return w;
}

// ------------------------------------------------------------------ yetenekler
export interface ReqCheck {
  req: Requirement;
  ok: boolean;
  text: string;
}

export function checkRequirements(c: CharLike, ab: Ability, data: RulesInput): ReqCheck[] {
  const eff = effectiveStats(c, data);
  return ab.requirements.map((r) => {
    switch (r.kind) {
      case "stat":
        return { req: r, ok: eff[r.stat].value >= r.min, text: `${STAT_LABELS[r.stat]} ${r.min}` };
      case "level":
        return { req: r, ok: c.level >= r.min, text: `Seviye ${r.min}` };
      case "corruption":
        return { req: r, ok: c.corruption >= r.min, text: `Corruption en az ${r.min}` };
      case "augments":
        return { req: r, ok: installedAugments(c.body, data).length >= r.min, text: `En az ${r.min} augment` };
      default:
        // Metin gereksinimleri otomatik doğrulanamaz; GM'e bırakılır.
        return { req: r, ok: true, text: r.text };
    }
  });
}

export type LearnState =
  | { state: "maxed"; level: number }
  | { state: "available"; nextLevel: number; problems: [] }
  | { state: "locked"; nextLevel: number; problems: string[] };

export function learnState(c: CharLike, abilityKey: string, data: RulesInput): LearnState {
  const ab = data.abilities[abilityKey];
  if (!ab) return { state: "locked", nextLevel: 1, problems: ["Bilinmeyen yetenek"] };
  const cur = c.abilities[abilityKey] ?? 0;
  if (cur >= ab.maxLevel) return { state: "maxed", level: cur };
  const next = cur + 1;
  const problems: string[] = [];
  if (!c.trees.includes(ab.tree)) problems.push("Ağaç açık değil");
  if (cur === 0) {
    if (ab.prerequisite && !(c.abilities[ab.prerequisite] > 0))
      problems.push(`Öncül: ${data.abilities[ab.prerequisite]?.name ?? ab.prerequisite}`);
    for (const r of checkRequirements(c, ab, data)) if (!r.ok) problems.push(r.text);
  }
  if (next >= 3 && c.level < ABILITY_LEVEL3_MIN_CHAR_LEVEL) problems.push(`3. seviye için karakter seviyesi ${ABILITY_LEVEL3_MIN_CHAR_LEVEL}`);
  if (c.abilityPoints < 1) problems.push("Yetenek puanı yok");
  return problems.length ? { state: "locked", nextLevel: next, problems } : { state: "available", nextLevel: next, problems: [] };
}

export function canOpenTree(c: CharLike, treeKey: string, data: RulesInput): string[] {
  const problems: string[] = [];
  if (!data.trees.some((t) => t.key === treeKey)) problems.push("Bilinmeyen ağaç");
  if (c.trees.includes(treeKey)) problems.push("Ağaç zaten açık");
  if (c.trees.length >= MAX_TREES) problems.push(`En fazla ${MAX_TREES} ağaç açılabilir`);
  if (c.abilityPoints < 1) problems.push("Yetenek puanı yok");
  return problems;
}

/** Bir yetenek alındığında hangi sinerjilerin aktif olduğunu döndürür. */
export function activeSynergies(c: Pick<CharLike, "abilities">, ab: Ability) {
  return ab.synergies.filter((k) => (c.abilities[k] ?? 0) > 0);
}

// ------------------------------------------------------------------ perkler
export interface PerkBudget {
  start: number;
  spent: number;
  gained: number;
  left: number;
  convertible: number;
  problems: string[];
}

export function perkBudget(keys: string[], start: number, data: Pick<RulesInput, "perks">): PerkBudget {
  const problems: string[] = [];
  let spent = 0;
  let gained = 0;
  const picked: Perk[] = [];
  for (const k of new Set(keys)) {
    const p = data.perks.find((x) => x.key === k);
    if (!p) {
      problems.push(`Bilinmeyen perk: ${k}`);
      continue;
    }
    picked.push(p);
    if (p.kind === "positive") spent += p.points;
    else gained += p.points;
  }
  for (const p of picked)
    for (const ex of p.exclusive)
      if (picked.some((q) => q.key === ex) && p.key < ex)
        problems.push(`${p.name} ile ${data.perks.find((q) => q.key === ex)?.name ?? ex} birlikte alınamaz`);
  const left = start + gained - spent;
  if (left < 0) problems.push("Perk puanı negatife düşemez");
  return { start, spent, gained, left, convertible: left > 0 ? Math.floor((left + 1) / 2) : 0, problems };
}

// ------------------------------------------------------------------ karakter yaratma
export interface CreationInput {
  tree: string;
  freeStats: Partial<Stats>;
  perks: string[];
  perkStats: Partial<Stats>;
  startAugment?: { key: string; part: string } | null;
  firstAbility?: string | null;
}

export interface CreationResult {
  ok: boolean;
  problems: string[];
  stats: Stats;
  corruption: number;
  body: Record<BodyPartKey, PartState>;
  abilities: Record<string, number>;
  abilityPoints: number;
  budget: PerkBudget;
}

function sumPoints(s: Partial<Stats>) {
  return Object.values(s).reduce((a, b) => a + (b ?? 0), 0);
}

export function buildCreation(input: CreationInput, startPerkPoints: number, data: RulesInput): CreationResult {
  const problems: string[] = [];
  const tree = data.trees.find((t) => t.key === input.tree);
  const stats = emptyStats();
  stats.klang = START_KLANG;
  let corruption = 0;
  const body = normalizeBody({});
  if (!tree) problems.push("Başlangıç ağacı seçilmedi");
  else {
    stats[tree.stat] += START_TREE_STAT;
    const b = tree.startBonus;
    if (b.kind === "stat") stats[b.stat] += b.amount;
    if (b.kind === "corruption") corruption += b.amount;
    if (b.kind === "augment") {
      const a = input.startAugment;
      const aug = a ? data.augments.find((x) => x.key === a.key) : undefined;
      if (!a || !aug) problems.push(`${tree.name} için başlangıç ${b.tier} augment'i seçilmeli`);
      else if (aug.tier !== b.tier) problems.push(`Başlangıç augment'i ${b.tier} olmalı`);
      else if (!aug.slots.includes(a.part as BodyPartKey)) problems.push(`${aug.name} bu uzva takılamaz`);
      else body[a.part as BodyPartKey].augment = aug.key;
    } else if (input.startAugment) problems.push("Bu ağaç başlangıç augment'i vermez");
  }

  for (const [k, v] of Object.entries(input.freeStats)) {
    if (!(STAT_KEYS as readonly string[]).includes(k) || !Number.isInteger(v) || (v ?? 0) < 0) {
      problems.push("Geçersiz stat dağılımı");
      continue;
    }
    if (tree && k === tree.stat && (v ?? 0) > 0) problems.push(`Serbest 2 puan ağaç stat'ına (${STAT_LABELS[tree.stat]}) verilemez`);
    stats[k as StatKey] += v ?? 0;
  }
  if (sumPoints(input.freeStats) !== START_FREE_STATS) problems.push(`Tam olarak ${START_FREE_STATS} serbest stat puanı dağıtılmalı`);

  const budget = perkBudget(input.perks, startPerkPoints, data);
  problems.push(...budget.problems);
  for (const [k, v] of Object.entries(input.perkStats)) {
    if (!(STAT_KEYS as readonly string[]).includes(k) || !Number.isInteger(v) || (v ?? 0) < 0) {
      problems.push("Geçersiz perk stat dağılımı");
      continue;
    }
    stats[k as StatKey] += v ?? 0;
  }
  if (sumPoints(input.perkStats) !== budget.convertible)
    problems.push(`Perk puanından dönüşen ${budget.convertible} stat puanı dağıtılmalı`);

  for (const k of STAT_KEYS) if (stats[k] > STAT_MAX) problems.push(`${STAT_LABELS[k]} ${STAT_MAX}'u geçemez`);

  const abilities: Record<string, number> = {};
  let abilityPoints = 1;
  if (input.firstAbility) {
    const c: CharLike = {
      level: 0,
      stats,
      trees: tree ? [tree.key] : [],
      abilities: {},
      perks: input.perks,
      body,
      corruption,
      inspiration: 0,
      abilityPoints: 1,
    };
    const st = learnState(c, input.firstAbility, data);
    if (st.state !== "available") problems.push(`İlk yetenek alınamıyor: ${st.state === "locked" ? st.problems.join(", ") : "zaten alınmış"}`);
    else {
      abilities[input.firstAbility] = 1;
      abilityPoints = 0;
    }
  }
  return { ok: problems.length === 0, problems, stats, corruption: Math.min(CORRUPTION_MAX, corruption), body, abilities, abilityPoints, budget };
}

// ------------------------------------------------------------------ corruption
export function clampCorruption(next: number, locked: boolean) {
  let v = Math.max(0, Math.min(CORRUPTION_MAX, Math.round(next)));
  if (locked) v = Math.max(CORRUPTION_LOCK, v);
  return { value: v, locked: locked || v >= CORRUPTION_LOCK };
}

export function blackMagicBonus(corruption: number) {
  const parts: { label: string; value: number }[] = [];
  if (corruption >= 1) parts.push({ label: "Corruption 1+ (kara büyü)", value: 2 });
  if (corruption >= 4) parts.push({ label: `Corruption ${corruption} (kara büyü)`, value: corruption - 3 });
  return parts;
}

// ------------------------------------------------------------------ zar
export interface CheckParams {
  stat: StatKey | null;
  part: BodyPartKey | null;
  modifier: number;
  blackMagic: boolean;
}

/** d20 sonucu hariç tüm eklemeleri hesaplar. */
export function checkModifiers(c: CharLike, p: CheckParams, data: Pick<RulesInput, "augments">) {
  const parts: { label: string; value: number }[] = [];
  const eff = effectiveStats(c, data);
  if (p.stat) parts.push({ label: STAT_LABELS[p.stat], value: eff[p.stat].value });
  if (p.part) {
    const st = normalizeBody(c.body)[p.part];
    const pen = woundPenalty(st);
    if (pen) parts.push({ label: `${bodyPartLabel(p.part)} yarası`, value: -pen });
  }
  if (eff.klang.value < 0 && p.stat !== "klang") parts.push({ label: "Negatif Klang", value: eff.klang.value });
  if (c.inspiration < 0) parts.push({ label: "Inspiration borcu", value: c.inspiration * INSPIRATION_DEBT_PENALTY });
  if (p.blackMagic) parts.push(...blackMagicBonus(c.corruption));
  if (p.modifier) parts.push({ label: "Durum", value: p.modifier });
  return parts;
}

export function outcomeFor(d20: number, total: number, threshold: number | null) {
  if (d20 === 20) return "crit-success" as const;
  if (d20 === 1) return "crit-fail" as const;
  if (threshold == null) return "info" as const;
  return total >= threshold ? ("success" as const) : ("fail" as const);
}

export function outcomeLabel(o: string) {
  return (
    {
      "crit-success": "Nat 20",
      "crit-fail": "Nat 1",
      success: "Başarılı",
      fail: "Başarısız",
      death: "Ölüm",
      save: "Kurtuluş",
      info: "",
    } as Record<string, string>
  )[o] ?? o;
}
