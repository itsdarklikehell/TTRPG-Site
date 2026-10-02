import assert from "node:assert/strict";
import { test } from "node:test";
import { rulesData } from "../src/lib/shz/content";
import { buildCreation, checkModifiers, clampCorruption, effectiveStats, emptyStats, learnState, normalizeBody, perkBudget, woundPenalty, type CharLike } from "../src/lib/shz/rules";

const data = rulesData();

function char(over: Partial<CharLike> = {}): CharLike {
  return { level: 0, stats: { ...emptyStats(), klang: 2 }, trees: ["ubermann"], abilities: {}, perks: [], body: {}, corruption: 0, inspiration: 0, abilityPoints: 1, ...over };
}

test("içerik: 7 ağaç, her biri 8 yetenek, 30/30 perk", () => {
  assert.equal(data.trees.length, 7);
  for (const t of data.trees) assert.equal(t.abilities.length, 8, t.name);
  assert.equal(data.perks.filter((p) => p.kind === "positive").length, 30);
  assert.equal(data.perks.filter((p) => p.kind === "negative").length, 30);
});

test("yaratma: ağaç +2, Klang 2, sınıf bonusu, 2 serbest puan ağaç stat'ına gidemez", () => {
  const ok = buildCreation({ tree: "ubermann", freeStats: { aim: 1, sanita: 1 }, perks: [], perkStats: {}, startAugment: null, firstAbility: null }, 0, data);
  assert.ok(ok.ok, ok.problems.join());
  assert.equal(ok.stats.korp, 2);
  assert.equal(ok.stats.krach, 1);
  assert.equal(ok.stats.klang, 2);
  const bad = buildCreation({ tree: "ubermann", freeStats: { korp: 2 }, perks: [], perkStats: {}, startAugment: null, firstAbility: null }, 0, data);
  assert.ok(!bad.ok);
});

test("perk bütçesi: negatife düşemez, artan (p+1)/2 aşağı", () => {
  const neg = data.perks.find((p) => p.kind === "negative" && p.points === 3)!;
  const b = perkBudget([neg.key], 2, data);
  assert.equal(b.left, 5);
  assert.equal(b.convertible, 3);
  const pos = data.perks.find((p) => p.kind === "positive" && p.points === 10)!;
  assert.ok(perkBudget([pos.key], 2, data).problems.length > 0);
  assert.equal(perkBudget([], 0, data).convertible, 0);
  assert.equal(perkBudget([], 1, data).convertible, 1);
});

test("perk dışlaması", () => {
  const p = data.perks.find((x) => x.exclusive.length)!;
  const b = perkBudget([p.key, p.exclusive[0]], 30, data);
  assert.ok(b.problems.some((x) => x.includes("birlikte")));
});

test("Metallkorp başlangıç augment'i ve Klang etkisi", () => {
  const r = buildCreation({ tree: "metallkorp", freeStats: { korp: 1, werk: 1 }, perks: [], perkStats: {}, startAugment: { key: "glasauge", part: "head" }, firstAbility: null }, 0, data);
  assert.ok(r.ok, r.problems.join());
  const eff = effectiveStats({ stats: r.stats, body: r.body, corruption: 0 }, data);
  assert.equal(eff.klang.value, 3); // 2 + 2 ağaç − 1 Glasauge
  assert.equal(eff.sicht.value, 2);
  const wrong = buildCreation({ tree: "metallkorp", freeStats: { korp: 1, werk: 1 }, perks: [], perkStats: {}, startAugment: { key: "glasauge", part: "l-arm" }, firstAbility: null }, 0, data);
  assert.ok(!wrong.ok);
});

test("yetenek: öncül, stat, seviye şartı ve 3. seviye kuralı", () => {
  const titan = data.abilities["titan"];
  assert.equal(learnState(char(), "titan", data).state, "locked");
  const strong = char({ level: 7, stats: { ...emptyStats(), korp: 7, krach: 5, klang: 2 }, abilities: { [titan.prerequisite!]: 1 } });
  assert.equal(learnState(strong, "titan", data).state, "available");
  const three = Object.values(data.abilities).find((a) => a.maxLevel === 3 && !a.prerequisite && a.requirements.length === 0)!;
  const c = char({ trees: [three.tree], abilities: { [three.key]: 2 }, abilityPoints: 1, level: 3 });
  const st = learnState(c, three.key, data);
  assert.equal(st.state, "locked");
  assert.ok(st.state === "locked" && st.problems.some((p) => p.includes("3. seviye")));
  assert.equal(learnState({ ...c, level: 4 }, three.key, data).state, "available");
});

test("yara cezası ve sargı", () => {
  assert.equal(woundPenalty({ wound: "agir", bandage: "yok" }), 5);
  assert.equal(woundPenalty({ wound: "agir", bandage: "temiz" }), 2);
  assert.equal(woundPenalty({ wound: "agir", bandage: "kirli" }), 3);
  assert.equal(woundPenalty({ wound: "saglam", bandage: "yok" }), 0);
});

test("zar düzenleyicileri: negatif Klang ve Inspiration borcu", () => {
  const body = normalizeBody({});
  body["r-hand"].wound = "hafif";
  const c = char({ stats: { ...emptyStats(), korp: 4, klang: -2 }, inspiration: -1, body });
  const parts = checkModifiers(c, { stat: "korp", part: "r-hand", modifier: 1, blackMagic: false }, data);
  const sum = parts.reduce((a, b) => a + b.value, 0);
  assert.equal(sum, 4 - 2 - 2 - 2 + 1);
});

test("Corruption 7 kilidi", () => {
  assert.deepEqual(clampCorruption(8, false), { value: 8, locked: true });
  assert.deepEqual(clampCorruption(3, true), { value: 7, locked: true });
  assert.deepEqual(clampCorruption(20, false), { value: 13, locked: true });
});
