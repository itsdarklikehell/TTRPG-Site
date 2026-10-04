// Schwarzesonne kural sabitleri. Bu dosya hem Next.js tarafında hem de
// socket sunucusu ve sync script'i tarafından kullanılır; bu yüzden
// yalnızca göreli import kullanır.

export const STAT_KEYS = [
  "korp",
  "krach",
  "klang",
  "sanita",
  "rede",
  "wissen",
  "sicht",
  "agil",
  "werk",
  "leis",
  "aim",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  korp: "Korp",
  krach: "Krach",
  klang: "Klang",
  sanita: "Sanita",
  rede: "Rede",
  wissen: "Wissen",
  sicht: "Sicht",
  agil: "Agil",
  werk: "Werk",
  leis: "Leis",
  aim: "Aim",
};

export const STAT_HINTS: Record<StatKey, string> = {
  korp: "Fiziksel direnç",
  krach: "Fiziksel hasar / uygulama",
  klang: "Augmentation uyumu",
  sanita: "Zihinsel direnç",
  rede: "İletişim",
  wissen: "Bilgi birikimi",
  sicht: "Görüş, ayrıntı yakalama",
  agil: "Çeviklik",
  werk: "Mühendislik, el becerisi",
  leis: "Gizlilik",
  aim: "Nişan alma",
};

export function statFromLabel(label: string): StatKey | null {
  const k = label
    .trim()
    .toLowerCase()
    .replace("ı", "i")
    .replace("İ", "i") as StatKey;
  return (STAT_KEYS as readonly string[]).includes(k) ? k : null;
}

export const STAT_MIN = 0;
export const STAT_MAX = 10;
export const START_KLANG = 2;
export const START_TREE_STAT = 2;
export const START_FREE_STATS = 2;

export const THRESHOLDS = [
  { key: "cok-kolay", label: "Çok Kolay", value: 7 },
  { key: "kolay", label: "Kolay", value: 9 },
  { key: "orta", label: "Orta", value: 13 },
  { key: "zor", label: "Zor", value: 15 },
  { key: "cok-zor", label: "Çok Zor", value: 19 },
  { key: "uber", label: "Uber", value: 22 },
] as const;
export type ThresholdKey = (typeof THRESHOLDS)[number]["key"];
export function thresholdByKey(k: string) {
  return THRESHOLDS.find((t) => t.key === k) ?? null;
}

export const BODY_PARTS = [
  { key: "head", label: "Baş & Boyun", vault: "HEAD & NECK" },
  { key: "upper-torso", label: "Üst Gövde", vault: "UPPER TORSO" },
  { key: "lower-torso", label: "Alt Gövde", vault: "LOWER TORSO" },
  { key: "l-arm", label: "Sol Kol", vault: "L-ARM" },
  { key: "r-arm", label: "Sağ Kol", vault: "R-ARM" },
  { key: "l-hand", label: "Sol El", vault: "L-HAND" },
  { key: "r-hand", label: "Sağ El", vault: "R-HAND" },
  { key: "l-leg", label: "Sol Bacak", vault: "L-LEG" },
  { key: "r-leg", label: "Sağ Bacak", vault: "R-LEG" },
  { key: "l-foot", label: "Sol Ayak", vault: "L-FOOT" },
  { key: "r-foot", label: "Sağ Ayak", vault: "R-FOOT" },
] as const;
export type BodyPartKey = (typeof BODY_PARTS)[number]["key"];
export const BODY_PART_KEYS = BODY_PARTS.map((b) => b.key) as BodyPartKey[];
export function bodyPartFromVault(label: string): BodyPartKey | null {
  const n = label.trim().toUpperCase();
  return BODY_PARTS.find((b) => b.vault === n)?.key ?? null;
}
export function bodyPartLabel(k: string) {
  return BODY_PARTS.find((b) => b.key === k)?.label ?? k;
}

/** Kriegsversehrt (kopuk uzuv) perki: kaç uzuv seçildiğine göre kazandırdığı perk puanı. */
export const KRIEGSVERSEHRT = { perk: "kriegsversehrt", points: { 1: 4, 2: 7 } as Record<number, number>, maxLimbs: 2 } as const;
/** Kopabilecek uzuvlar (baş/boyun ve gövde seçilemez). Kol kopunca el, bacak kopunca ayak da kopar. */
export const AMPUTABLE_PARTS: BodyPartKey[] = ["l-arm", "r-arm", "l-hand", "r-hand", "l-leg", "r-leg", "l-foot", "r-foot"];
export const LIMB_CHILD: Partial<Record<BodyPartKey, BodyPartKey>> = { "l-arm": "l-hand", "r-arm": "r-hand", "l-leg": "l-foot", "r-leg": "r-foot" };
export const LIMB_PARENT: Partial<Record<BodyPartKey, BodyPartKey>> = { "l-hand": "l-arm", "r-hand": "r-arm", "l-foot": "l-leg", "r-foot": "r-leg" };

export const WOUNDS = [
  { key: "saglam", label: "Sağlam", penalty: 0 },
  { key: "cizik", label: "Çizik", penalty: 1 },
  { key: "hafif", label: "Hafif Yaralı", penalty: 2 },
  { key: "agir", label: "Ağır Yaralı", penalty: 5 },
  { key: "kullanilamaz", label: "Kullanılamaz", penalty: 15 },
  { key: "kopuk", label: "Kopuk", penalty: 20 },
] as const;
export type WoundKey = (typeof WOUNDS)[number]["key"];
export const WOUND_KEYS = WOUNDS.map((w) => w.key) as WoundKey[];

export const BANDAGES = [
  { key: "yok", label: "Sargısız" },
  { key: "temiz", label: "Sargılı (Temiz)" },
  { key: "kirli", label: "Sargılı (Kirli)" },
] as const;
export type BandageKey = (typeof BANDAGES)[number]["key"];
export const BANDAGE_KEYS = BANDAGES.map((b) => b.key) as BandageKey[];

export const CORRUPTION_MAX = 13;
export const CORRUPTION_LOCK = 7; // 7'ye ulaşan karakter 7'nin altına inemez
export const CORRUPTION_PERVITIN_IMMUNE = 10;

export const CORRUPTION_EFFECTS: Record<number, string> = {
  0: "Hiçbir etki yoktur.",
  1: "Her kara büyü zarına +2.",
  2: "Ek negatif etki yoktur.",
  3: "Bu seviyeden sonra her Corruption için +1 Klang.",
  4: "Bu seviyeden sonra her Corruption için kara büyü zarlarına +1.",
  5: "Cower durumu açılır (hasar alınca gerçekleşme zarı, kurtulmak için Sanita).",
  6: "Saldırı aksiyonları hırçınlaşır.",
  7: "Corruption artık 7'nin altına düşürülemez.",
  8: "Aksiyonlar dengesizleşmeye başlar.",
  9: "Frenzy durumu açılır (düşman öldürünce gerçekleşme zarı).",
  10: "Pervitin / Metamfetamin artık Corruption'ı etkilemez.",
  11: "Aksiyonlar ciddi seviyede dengesizleşir.",
  12: "Aksiyonlar tamamen dengesizleşir.",
  13: "Zihinsel sağlık çöker. Ölüm gerçekleşir.",
};

export const LEVEL_CAP_DEFAULT = 10;
export const LEVEL_CAP_MAX = 15;
export const ABILITY_LEVEL3_MIN_CHAR_LEVEL = 4;
export const MAX_TREES = 2;
export const INSPIRATION_DEBT_PENALTY = 2;
export const AGE_MIN = 18;
export const AGE_MAX = 60;
