"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Modal, Tabs, useToast } from "@/components/interactive";
import { Badge, Button, cx } from "@/components/ui";
import type { Character, RollDetail } from "@/db/schema";
import { BASE_PATH } from "@/lib/base";
import { api } from "@/lib/client";
import { BODY_PARTS, CORRUPTION_EFFECTS, STAT_KEYS, STAT_LABELS, THRESHOLDS, type BodyPartKey, type StatKey } from "@/lib/shz/constants";
import type { Augment } from "@/lib/shz/content-types";
import { checkModifiers, normalizeBody, outcomeLabel, woundPenalty } from "@/lib/shz/rules";

type FullChar = Omit<Character, "createdAt" | "updatedAt">;
type PublicChar = Pick<FullChar, "id" | "userId" | "name" | "status" | "level" | "nationality" | "alignment" | "age" | "appearance" | "trees">;
type Entry = { view: "gm" | "owner"; character: FullChar } | { view: "public"; character: PublicChar };

interface Msg {
  id: string;
  campaignId: string;
  userId: string | null;
  characterId: string | null;
  recipientId: string | null;
  channel: "IC" | "OOC" | "WHISPER" | "SYSTEM";
  content: string;
  createdAt: string;
  userName: string | null;
  characterName: string | null;
}
interface RollV {
  id: string;
  userId: string | null;
  characterId: string | null;
  kind: string;
  label: string;
  dice: number[];
  detail: RollDetail;
  hidden: boolean;
  rerolled: boolean;
  createdAt: string;
  userName: string | null;
  characterName: string | null;
}
interface RollReq {
  id: string;
  characters: { id: string; name: string; userId: string }[];
  stat: StatKey;
  threshold: string | null;
  thresholdLabel: string | null;
  label: string;
  blackMagic: boolean;
}
type FeedItem = { t: "m"; at: string; m: Msg } | { t: "r"; at: string; r: RollV };
type Ack = { ok: true; data?: unknown } | { ok: false; error: string };

export function Room({
  campaign,
  me,
  isGM,
  gm,
  members,
  initialChars,
  augments,
}: {
  campaign: { id: string; name: string; deathSaveEnabled: boolean };
  me: { id: string; displayName: string };
  isGM: boolean;
  gm: { id: string; displayName: string };
  members: { id: string; displayName: string }[];
  initialChars: Entry[];
  augments: Augment[];
}) {
  const toast = useToast();
  const sock = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [chars, setChars] = useState<Entry[]>(initialChars);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [rolls, setRolls] = useState<RollV[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  const [requests, setRequests] = useState<RollReq[]>([]);
  const [mobileTab, setMobileTab] = useState<"parti" | "akis" | "zar">("akis");

  const emit = useCallback(
    (ev: string, payload: unknown) =>
      new Promise<Ack>((resolve) => {
        const s = sock.current;
        if (!s?.connected) return resolve({ ok: false, error: "Bağlantı yok." });
        s.timeout(10_000).emit(ev, payload, (err: Error | null, r: Ack) => resolve(err ? { ok: false, error: "Sunucu yanıt vermedi." } : r));
      }),
    [],
  );

  const refreshChar = useCallback(async (characterId: string) => {
    try {
      const r = await api<Entry>(`/api/characters/${characterId}`);
      setChars((list) => {
        const i = list.findIndex((e) => e.character.id === characterId);
        if (i < 0) return [...list, r];
        const n = [...list];
        n[i] = r;
        return n;
      });
    } catch {
      /* erişim yoksa yok say */
    }
  }, []);

  useEffect(() => {
    const s = io({ path: `${BASE_PATH}/socket.io`, withCredentials: true, transports: ["websocket", "polling"] });
    sock.current = s;
    s.on("connect", () => {
      setConnected(true);
      s.emit("join", { campaignId: campaign.id }, (r: Ack) => {
        if (!r.ok) return toast(r.error, "error");
        const d = r.data as { online: string[]; messages: Msg[]; rolls: RollV[] };
        setOnline(d.online);
        setMsgs(d.messages);
        setRolls(d.rolls);
      });
    });
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", () => setConnected(false));
    s.on("message", (m: Msg) => m.campaignId === campaign.id && setMsgs((x) => (x.some((y) => y.id === m.id) ? x : [...x.slice(-299), m])));
    s.on("roll", (r: RollV & { campaignId: string }) => r.campaignId === campaign.id && setRolls((x) => (x.some((y) => y.id === r.id) ? x : [...x.slice(-199), r])));
    s.on("roll:rerolled", ({ id }: { id: string }) => setRolls((x) => x.map((r) => (r.id === id ? { ...r, rerolled: true } : r))));
    s.on("presence", (p: { campaignId: string; online: string[] }) => p.campaignId === campaign.id && setOnline(p.online));
    s.on("roll:request", (q: RollReq) => setRequests((x) => [...x, q]));
    s.on("character:changed", ({ characterId }: { characterId: string }) => refreshChar(characterId));
    s.on("messages:refresh", () =>
      s.emit("join", { campaignId: campaign.id }, (r: Ack) => {
        if (r.ok) setMsgs((r.data as { messages: Msg[] }).messages);
      }),
    );
    return () => {
      s.disconnect();
    };
  }, [campaign.id, refreshChar, toast]);

  const feed = useMemo<FeedItem[]>(
    () => [...msgs.map((m) => ({ t: "m" as const, at: m.createdAt, m })), ...rolls.map((r) => ({ t: "r" as const, at: r.createdAt, r }))].sort((a, b) => a.at.localeCompare(b.at)),
    [msgs, rolls],
  );
  const myChars = chars.filter((e): e is Extract<Entry, { view: "gm" | "owner" }> => e.view !== "public" && (isGM || e.character.userId === me.id) && e.character.status === "ACTIVE");
  const myRequests = requests.filter((q) => q.characters.some((c) => myChars.some((m) => m.character.id === c.id && (isGM ? c.userId === me.id : true))));

  const party = <Party chars={chars} online={online} isGM={isGM} me={me.id} gm={gm} members={members} campaign={campaign} />;
  const dice = (
    <DicePanel
      myChars={myChars.map((e) => e.character)}
      allChars={isGM ? chars.filter((e) => e.view === "gm" && e.character.status === "ACTIVE").map((e) => e.character as FullChar) : []}
      isGM={isGM}
      augments={augments}
      emit={emit}
      deathSaveEnabled={campaign.deathSaveEnabled}
      campaignId={campaign.id}
    />
  );
  const feedEl = (
    <Feed
      items={feed}
      me={me.id}
      isGM={isGM}
      myChars={myChars.map((e) => e.character)}
      members={members}
      gm={gm}
      emit={emit}
      campaignId={campaign.id}
      requests={myRequests}
      onRequestDone={(id) => setRequests((x) => x.filter((q) => q.id !== id))}
    />
  );

  return (
    <div className="-mx-4 -my-8 sm:-mx-6 sm:-my-10">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="kicker">Oyun odası</p>
          <Link href={`/kampanya/${campaign.id}`} className="truncate font-serif text-lg text-ink hover:text-accent">
            {campaign.name}
          </Link>
        </div>
        <span className={cx("flex items-center gap-2 text-xs", connected ? "text-ok" : "text-danger")}>
          <span className={cx("h-2 w-2 rounded-full", connected ? "bg-ok" : "bg-danger")} />
          {connected ? "Bağlı" : "Bağlanıyor…"}
        </span>
      </div>
      <div className="lg:hidden">
        <Tabs
          className="px-2"
          value={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { key: "parti", label: "Parti" },
            { key: "akis", label: "Akış", badge: myRequests.length ? <span className="h-2 w-2 rounded-full bg-accent" /> : undefined },
            { key: "zar", label: "Zar" },
          ]}
        />
      </div>
      <div className="grid h-[calc(100dvh-11.75rem)] lg:h-[calc(100dvh-8.75rem)] lg:grid-cols-[290px_1fr_330px]">
        <div className={cx("overflow-y-auto border-line lg:block lg:border-r", mobileTab === "parti" ? "block" : "hidden")}>{party}</div>
        <div className={cx("min-h-0 lg:flex", mobileTab === "akis" ? "flex" : "hidden")}>{feedEl}</div>
        <div className={cx("overflow-y-auto border-line lg:block lg:border-l", mobileTab === "zar" ? "block" : "hidden")}>{dice}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ parti
function Party({
  chars,
  online,
  isGM,
  me,
  gm,
  members,
  campaign,
}: {
  chars: Entry[];
  online: string[];
  isGM: boolean;
  me: string;
  gm: { id: string; displayName: string };
  members: { id: string; displayName: string }[];
  campaign: { id: string };
}) {
  const toast = useToast();
  const quick = async (id: string, body: Record<string, unknown>) => {
    try {
      await api(`/api/characters/${id}/gm`, { method: "PATCH", body });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <div className="space-y-3 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Parti</p>
      {chars.length === 0 && <p className="text-sm text-muted">Aktif karakter yok.</p>}
      {chars.map((e) => {
        const c = e.character;
        const on = online.includes(c.userId);
        const full = e.view !== "public" ? (e.character as FullChar) : null;
        const body = full ? normalizeBody(full.body) : null;
        const hurt = body ? BODY_PARTS.filter((p) => body[p.key].wound !== "saglam") : [];
        return (
          <div key={c.id} className={cx("rounded-xl border bg-surface p-3", c.userId === me ? "border-accent/40" : "border-line")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/karakter/${c.id}`} className="block truncate font-serif text-[15px] text-ink hover:text-accent">
                  {c.name}
                </Link>
                <p className="text-[11px] text-muted">
                  Sv {c.level} · {members.find((m) => m.id === c.userId)?.displayName ?? (c.userId === gm.id ? gm.displayName : "")}
                </p>
              </div>
              <span title={on ? "Çevrimiçi" : "Çevrimdışı"} className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", on ? "bg-ok" : "bg-line")} />
            </div>
            {c.status !== "ACTIVE" && <Badge tone="warn" className="mt-2">{c.status === "PENDING" ? "Onay bekliyor" : c.status}</Badge>}
            {full && (
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted" title={CORRUPTION_EFFECTS[full.corruption]}>
                    Corruption
                  </span>
                  <span className="flex items-center gap-1.5">
                    {isGM && <MiniBtn onClick={() => quick(c.id, { corruption: Math.max(0, full.corruption - 1) })}>−</MiniBtn>}
                    <span className={cx("w-8 text-center font-mono", full.corruption >= 7 ? "text-danger" : full.corruption >= 4 && "text-warn")}>{full.corruption}</span>
                    {isGM && <MiniBtn onClick={() => quick(c.id, { corruption: Math.min(13, full.corruption + 1) })}>+</MiniBtn>}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Inspiration</span>
                  <span className="flex items-center gap-1.5">
                    {isGM && <MiniBtn onClick={() => quick(c.id, { inspiration: full.inspiration - 1 })}>−</MiniBtn>}
                    <span className={cx("w-8 text-center font-mono", full.inspiration < 0 && "text-danger")}>{full.inspiration}</span>
                    {isGM && <MiniBtn onClick={() => quick(c.id, { inspiration: full.inspiration + 1 })}>+</MiniBtn>}
                  </span>
                </div>
                {campaign && full.deathSave && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Death Save</span>
                    <span className="font-mono">{full.deathSave.available ? `Ö${full.deathSave.deaths} K${full.deathSave.saves}` : "yok"}</span>
                  </div>
                )}
                {hurt.length > 0 && (
                  <p className="text-danger/90">
                    {hurt.map((p) => `${p.label} −${woundPenalty(body![p.key])}`).join(" · ")}
                  </p>
                )}
                {full.abilityPoints > 0 && <p className="text-accent">{full.abilityPoints} yetenek puanı harcanmamış</p>}
              </div>
            )}
          </div>
        );
      })}
      <div className="pt-2">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">Masada</p>
        <ul className="space-y-1 text-sm">
          {[gm, ...members].map((u) => (
            <li key={u.id} className="flex items-center gap-2">
              <span className={cx("h-1.5 w-1.5 rounded-full", online.includes(u.id) ? "bg-ok" : "bg-line")} />
              <span className={cx(online.includes(u.id) ? "text-ink" : "text-muted")}>{u.displayName}</span>
              {u.id === gm.id && <span className="text-[10px] font-semibold text-accent">GM</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MiniBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-5 w-5 rounded border border-line text-[11px] leading-none text-muted hover:border-accent hover:text-ink">
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ akış
function Feed({
  items,
  me,
  isGM,
  myChars,
  members,
  gm,
  emit,
  campaignId,
  requests,
  onRequestDone,
}: {
  items: FeedItem[];
  me: string;
  isGM: boolean;
  myChars: FullChar[];
  members: { id: string; displayName: string }[];
  gm: { id: string; displayName: string };
  emit: (ev: string, p: unknown) => Promise<Ack>;
  campaignId: string;
  requests: RollReq[];
  onRequestDone: (id: string) => void;
}) {
  const toast = useToast();
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"IC" | "OOC" | "WHISPER">("IC");
  const [asChar, setAsChar] = useState<string>(myChars[0]?.id ?? "");
  const [to, setTo] = useState<string>(members[0]?.id ?? "");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!asChar && myChars[0]) setAsChar(myChars[0].id);
  }, [myChars, asChar]);
  useEffect(() => {
    const b = box.current;
    if (!b) return;
    if (b.scrollHeight - b.scrollTop - b.clientHeight < 240) end.current?.scrollIntoView({ block: "end" });
  }, [items.length]);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), []);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    const r = await emit("chat", {
      campaignId,
      channel,
      text: t,
      characterId: channel === "IC" && asChar ? asChar : null,
      recipientId: channel === "WHISPER" && isGM ? to : null,
    });
    setSending(false);
    if (!r.ok) return toast(r.error, "error");
    setText("");
  };

  const nameOf = (id: string | null) => (id === gm.id ? gm.displayName : members.find((m) => m.id === id)?.displayName ?? "?");

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div ref={box} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-6">
        {items.length === 0 && <p className="py-10 text-center text-sm text-muted">Henüz bir şey yok. İlk sözü söyle ya da zar at.</p>}
        {items.map((it) =>
          it.t === "m" ? (
            <MessageRow key={`m${it.m.id}`} m={it.m} me={me} nameOf={nameOf} />
          ) : (
            <RollCard
              key={`r${it.r.id}`}
              r={it.r}
              canReroll={!it.r.rerolled && !!it.r.characterId && it.r.kind !== "death" && it.r.kind !== "pervitin" && (isGM || myChars.some((c) => c.id === it.r.characterId && c.inspiration > 0))}
              onReroll={async () => {
                const res = await emit("reroll", { campaignId, rollId: it.r.id });
                if (!res.ok) toast(res.error, "error");
              }}
            />
          ),
        )}
        <div ref={end} />
      </div>
      {requests.length > 0 && (
        <div className="space-y-2 border-t border-accent/40 bg-accent/[0.06] px-4 py-3 sm:px-6">
          {requests.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <strong className="text-accent">GM zar istiyor:</strong> {q.label}
                {q.thresholdLabel && ` · ${q.thresholdLabel}`}
              </span>
              <span className="flex flex-wrap gap-2">
                {q.characters
                  .filter((c) => myChars.some((m) => m.id === c.id))
                  .map((c) => (
                    <Button
                      key={c.id}
                      size="sm"
                      variant="primary"
                      onClick={async () => {
                        const r = await emit("roll", {
                          campaignId,
                          characterId: c.id,
                          stat: q.stat,
                          threshold: q.threshold,
                          part: null,
                          modifier: 0,
                          blackMagic: q.blackMagic,
                          label: q.label,
                          hidden: false,
                          requestId: q.id,
                        });
                        if (!r.ok) return toast(r.error, "error");
                        if (q.characters.filter((x) => myChars.some((m) => m.id === x.id)).length <= 1) onRequestDone(q.id);
                      }}
                    >
                      {c.name} için at
                    </Button>
                  ))}
                <Button size="sm" variant="ghost" onClick={() => onRequestDone(q.id)}>
                  Kapat
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}
      <form
        className="border-t border-line px-4 py-3 sm:px-6"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          {(["IC", "OOC", "WHISPER"] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={cx("rounded-full border px-2.5 py-1", channel === ch ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:text-ink")}
            >
              {ch === "IC" ? "Karakter (IC)" : ch === "OOC" ? "Oyun dışı (OOC)" : isGM ? "Fısıltı" : "GM'e fısılda"}
            </button>
          ))}
          {channel === "IC" && myChars.length > 0 && (
            <select value={asChar} onChange={(e) => setAsChar(e.target.value)} className="input h-7 w-auto py-0 text-xs">
              {isGM && <option value="">GM / anlatıcı</option>}
              {myChars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {channel === "WHISPER" && isGM && (
            <select value={to} onChange={(e) => setTo(e.target.value)} className="input h-7 w-auto py-0 text-xs">
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  → {m.displayName}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={channel === "IC" ? "Karakterin ne söylüyor / yapıyor?" : channel === "OOC" ? "Masaya bir not…" : "Gizli mesaj…"}
            className="input min-h-[42px] resize-none"
          />
          <Button type="submit" variant="primary" disabled={sending || !text.trim()}>
            Gönder
          </Button>
        </div>
      </form>
    </div>
  );
}

function time(s: string) {
  return new Date(s).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function MessageRow({ m, me, nameOf }: { m: Msg; me: string; nameOf: (id: string | null) => string }) {
  if (m.channel === "SYSTEM")
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full border border-line bg-surface2/60 px-3 py-1 text-center text-xs text-muted">{m.content}</span>
      </div>
    );
  if (m.channel === "WHISPER")
    return (
      <div className="rounded-lg border border-accent/40 bg-accent/[0.06] px-3 py-2 text-sm">
        <p className="mb-0.5 text-[11px] text-accent">
          Fısıltı · {m.userId === me ? `sen → ${nameOf(m.recipientId)}` : `${m.userName} → ${m.recipientId === me ? "sana" : nameOf(m.recipientId)}`} · {time(m.createdAt)}
        </p>
        <p className="whitespace-pre-wrap break-words">{m.content}</p>
      </div>
    );
  if (m.channel === "OOC")
    return (
      <p className="px-1 text-sm text-muted">
        <span className="text-ink/70">{m.userName}</span> <span className="text-[10px]">{time(m.createdAt)}</span>
        <span className="ml-2 whitespace-pre-wrap break-words">(( {m.content} ))</span>
      </p>
    );
  return (
    <div className="px-1 py-1">
      <p className="text-[11px] text-muted">
        <span className="font-serif text-[15px] text-accent">{m.characterName ?? `${m.userName} (anlatıcı)`}</span> · {time(m.createdAt)}
      </p>
      <p className="whitespace-pre-wrap break-words font-serif text-[15px] text-ink">{m.content}</p>
    </div>
  );
}

const OUTCOME_TONE: Record<string, string> = {
  success: "border-ok/50 bg-ok/10 text-ok",
  "crit-success": "border-accent bg-accent/20 text-accent",
  fail: "border-danger/50 bg-danger/10 text-danger",
  "crit-fail": "border-danger bg-danger/20 text-danger",
  death: "border-danger/50 bg-danger/10 text-danger",
  save: "border-ok/50 bg-ok/10 text-ok",
  info: "border-line bg-surface2 text-muted",
};

function RollCard({ r, canReroll, onReroll }: { r: RollV; canReroll: boolean; onReroll: () => void }) {
  const d = r.detail;
  return (
    <div className={cx("rounded-xl border bg-surface px-4 py-3", r.rerolled ? "border-line opacity-50" : "border-line", r.hidden && "border-dashed")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted">
            {r.characterName ?? r.userName} · {time(r.createdAt)}
            {r.hidden && " · gizli"}
            {r.rerolled && " · yeniden atıldı"}
          </p>
          <p className="font-medium text-ink">{r.label}</p>
        </div>
        <div className="flex items-center gap-2">
          {d.outcome !== "info" && <span className={cx("rounded-md border px-2 py-0.5 text-xs font-semibold", OUTCOME_TONE[d.outcome])}>{outcomeLabel(d.outcome)}</span>}
          <span className="grid h-11 min-w-11 place-items-center rounded-lg bg-surface2 px-2 font-mono text-2xl text-ink">{d.total}</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        {d.parts.map((p, i) => (
          <span key={i} className={cx("rounded px-1.5 py-0.5 font-mono", i === 0 ? "bg-accent/15 text-accent" : p.value < 0 ? "bg-danger/10 text-danger" : "bg-surface2 text-ink/80")}>
            {p.label} {i === 0 ? p.value : `${p.value >= 0 ? "+" : ""}${p.value}`}
          </span>
        ))}
        {d.threshold != null && (
          <span className="text-muted">
            ≥ {d.threshold} ({d.thresholdLabel})
          </span>
        )}
      </div>
      {d.note && r.kind !== "check" && r.kind !== "kara-buyu" && <p className="mt-1.5 text-xs text-ink/80">{d.note}</p>}
      {canReroll && (
        <button type="button" onClick={onReroll} className="mt-2 text-xs text-accent hover:underline">
          Inspiration harca, yeniden at
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ zar paneli
function DicePanel({
  myChars,
  allChars,
  isGM,
  augments,
  emit,
  deathSaveEnabled,
  campaignId,
}: {
  myChars: FullChar[];
  allChars: FullChar[];
  isGM: boolean;
  augments: Augment[];
  emit: (ev: string, p: unknown) => Promise<Ack>;
  deathSaveEnabled: boolean;
  campaignId: string;
}) {
  const toast = useToast();
  const choices = isGM ? allChars : myChars;
  const [charId, setCharId] = useState<string>(choices[0]?.id ?? "");
  const [stat, setStat] = useState<StatKey | "">("korp");
  const [threshold, setThreshold] = useState<string | null>("orta");
  const [part, setPart] = useState<BodyPartKey | "">("");
  const [mod, setMod] = useState(0);
  const [bm, setBm] = useState(false);
  const [label, setLabel] = useState("");
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);

  useEffect(() => {
    if (!choices.some((c) => c.id === charId)) setCharId(choices[0]?.id ?? "");
  }, [choices, charId]);
  const ch = choices.find((c) => c.id === charId) ?? null;
  const parts = ch ? checkModifiers(ch, { stat: stat || null, part: part || null, modifier: mod, blackMagic: bm }, { augments }) : mod ? [{ label: "Düzenleyici", value: mod }] : [];
  const sum = parts.reduce((a, b) => a + b.value, 0);

  const doEmit = async (ev: string, payload: unknown) => {
    setBusy(true);
    const r = await emit(ev, payload);
    setBusy(false);
    if (!r.ok) toast(r.error, "error");
    return r.ok;
  };

  return (
    <div className="space-y-4 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Zar · d20 + stat ≥ eşik</p>
      {choices.length === 0 && !isGM && <p className="text-sm text-muted">Zar atmak için onaylanmış bir karakterin olmalı.</p>}
      {(choices.length > 0 || isGM) && (
        <>
          <label className="block">
            <span className="label">Karakter</span>
            <select className="input" value={charId} onChange={(e) => setCharId(e.target.value)}>
              {isGM && <option value="">GM (karaktersiz d20)</option>}
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {ch && (
            <div>
              <span className="label">Stat</span>
              <div className="grid grid-cols-4 gap-1">
                {STAT_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setStat(stat === k ? "" : k)}
                    className={cx("rounded-md border px-1 py-1.5 text-xs", stat === k ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:text-ink")}
                  >
                    {STAT_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="label">Eşik</span>
            <div className="grid grid-cols-4 gap-1">
              <button type="button" onClick={() => setThreshold(null)} className={cx("rounded-md border px-1 py-1.5 text-xs", threshold === null ? "border-accent bg-accent/15" : "border-line text-muted")}>
                Yok
              </button>
              {THRESHOLDS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setThreshold(t.key)}
                  className={cx("rounded-md border px-1 py-1.5 text-xs", threshold === t.key ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:text-ink")}
                >
                  {t.label} <span className="font-mono">{t.value}</span>
                </button>
              ))}
            </div>
          </div>
          {ch && (
            <label className="block">
              <span className="label">Kullanılan uzuv (yara cezası)</span>
              <select className="input" value={part} onChange={(e) => setPart(e.target.value as BodyPartKey | "")}>
                <option value="">Yok</option>
                {BODY_PARTS.map((p) => {
                  const pen = woundPenalty(normalizeBody(ch.body)[p.key]);
                  return (
                    <option key={p.key} value={p.key}>
                      {p.label}
                      {pen ? ` (−${pen})` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
          <div className="flex items-center justify-between">
            <span className="label mb-0">Durum düzenleyici</span>
            <span className="flex items-center gap-1.5">
              <MiniBtn onClick={() => setMod(Math.max(-20, mod - 1))}>−</MiniBtn>
              <span className="w-8 text-center font-mono">{mod > 0 ? `+${mod}` : mod}</span>
              <MiniBtn onClick={() => setMod(Math.min(20, mod + 1))}>+</MiniBtn>
            </span>
          </div>
          {ch && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bm} onChange={(e) => setBm(e.target.checked)} className="h-4 w-4 accent-[rgb(186,168,240)]" />
              Kara büyü zarı (Corruption etkileri)
            </label>
          )}
          {isGM && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-4 w-4 accent-[rgb(186,168,240)]" />
              Gizli at (yalnızca GM görür)
            </label>
          )}
          <input className="input" placeholder="Açıklama (ör. Kapıyı kır)" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
          <div className="rounded-lg border border-line bg-surface2/50 px-3 py-2 text-xs">
            <span className="text-muted">d20 </span>
            {parts.map((p, i) => (
              <span key={i} className={cx(p.value < 0 ? "text-danger" : "text-ink/80")}>
                {" "}
                {p.value >= 0 ? "+" : "−"} {Math.abs(p.value)} <span className="text-muted">{p.label}</span>
              </span>
            ))}
            <span className="ml-1 font-mono text-ink"> = d20 {sum >= 0 ? "+" : "−"} {Math.abs(sum)}</span>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={busy || (!ch && !isGM)}
            onClick={() =>
              doEmit("roll", {
                campaignId,
                characterId: ch?.id ?? null,
                stat: ch ? stat || null : null,
                threshold,
                part: ch ? part || null : null,
                modifier: mod,
                blackMagic: !!ch && bm,
                label,
                hidden: isGM && hidden,
              }).then((ok) => ok && setLabel(""))
            }
          >
            Zar at
          </Button>
          {ch && (
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={busy || !deathSaveEnabled || !ch.deathSave.available} onClick={() => doEmit("death", { campaignId, characterId: ch.id })} title={!deathSaveEnabled ? "Kapalı" : undefined}>
                Death Save (d6)
              </Button>
              <Button disabled={busy || !threshold} onClick={() => doEmit("pervitin", { campaignId, characterId: ch.id, threshold: threshold ?? "orta" })} title="d20 + Sanita − Corruption/3 ≥ eşik">
                Pervitin zarı
              </Button>
            </div>
          )}
        </>
      )}
      {isGM && (
        <div className="border-t border-line pt-4">
          <Button variant="outline" className="w-full" disabled={!allChars.length} onClick={() => setReqOpen(true)}>
            Oyunculardan zar iste
          </Button>
          <RequestModal open={reqOpen} onClose={() => setReqOpen(false)} chars={allChars} emit={emit} campaignId={campaignId} />
        </div>
      )}
    </div>
  );
}

function RequestModal({ open, onClose, chars, emit, campaignId }: { open: boolean; onClose: () => void; chars: FullChar[]; emit: (ev: string, p: unknown) => Promise<Ack>; campaignId: string }) {
  const toast = useToast();
  const [ids, setIds] = useState<string[]>([]);
  const [stat, setStat] = useState<StatKey>("sanita");
  const [threshold, setThreshold] = useState<string | null>("orta");
  const [label, setLabel] = useState("");
  const [bm, setBm] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Zar iste">
      <div className="space-y-4">
        <div>
          <span className="label">Kimler?</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" onClick={() => setIds(ids.length === chars.length ? [] : chars.map((c) => c.id))}>
              {ids.length === chars.length ? "Hiçbiri" : "Herkes"}
            </button>
            {chars.map((c) => (
              <label key={c.id} className={cx("chip cursor-pointer", ids.includes(c.id) && "border-accent text-accent")}>
                <input type="checkbox" className="hidden" checked={ids.includes(c.id)} onChange={(e) => setIds(e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id))} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Stat</span>
            <select className="input" value={stat} onChange={(e) => setStat(e.target.value as StatKey)}>
              {STAT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {STAT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Eşik</span>
            <select className="input" value={threshold ?? ""} onChange={(e) => setThreshold(e.target.value || null)}>
              <option value="">Gizli / yok</option>
              {THRESHOLDS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} ({t.value})
                </option>
              ))}
            </select>
          </label>
        </div>
        <input className="input" placeholder="Açıklama (ör. Ritüeli gördünüz)" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bm} onChange={(e) => setBm(e.target.checked)} className="h-4 w-4 accent-[rgb(186,168,240)]" />
          Kara büyü zarı
        </label>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Vazgeç</Button>
          <Button
            variant="primary"
            disabled={!ids.length}
            onClick={async () => {
              const r = await emit("request", { campaignId, characterIds: ids, stat, threshold, label, blackMagic: bm });
              if (!r.ok) return toast(r.error, "error");
              onClose();
              setIds([]);
              setLabel("");
            }}
          >
            İste
          </Button>
        </div>
      </div>
    </Modal>
  );
}
