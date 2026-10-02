import fs from "node:fs";
import path from "node:path";
import type { Ability, Augment, Content, Perk, Tree } from "./content-types";

// content/shz.json dosyasını okur ve önbelleğe alır. Dosya değişirse
// (geliştirme sırasında npm run sync) bir sonraki çağrıda yeniden okunur.

let cache: { mtime: number; data: Content; idx: Index } | null = null;

interface Index {
  tree: Map<string, Tree>;
  perk: Map<string, Perk>;
  augment: Map<string, Augment>;
}

function file() {
  return path.join(process.cwd(), "content", "shz.json");
}

function load() {
  const f = file();
  const mtime = fs.statSync(f).mtimeMs;
  if (cache && cache.mtime === mtime) return cache;
  const data = JSON.parse(fs.readFileSync(f, "utf8")) as Content;
  cache = {
    mtime,
    data,
    idx: {
      tree: new Map(data.trees.map((t) => [t.key, t])),
      perk: new Map(data.perks.map((p) => [p.key, p])),
      augment: new Map(data.augments.map((a) => [a.key, a])),
    },
  };
  return cache;
}

export function content(): Content {
  return load().data;
}
export function getTree(key: string): Tree | undefined {
  return load().idx.tree.get(key);
}
export function getAbility(key: string): Ability | undefined {
  return load().data.abilities[key];
}
export function getPerk(key: string): Perk | undefined {
  return load().idx.perk.get(key);
}
export function getAugment(key: string): Augment | undefined {
  return load().idx.augment.get(key);
}

/** Kural motorunun ihtiyaç duyduğu içerik alt kümesi (istemciye de gönderilebilir). */
export interface RulesData {
  trees: Tree[];
  abilities: Record<string, Ability>;
  perks: Perk[];
  augments: Augment[];
}
export function rulesData(): RulesData {
  const c = content();
  return { trees: c.trees, abilities: c.abilities, perks: c.perks, augments: c.augments };
}
