// Schwarzesonne 2.0 veritabanı şeması (Drizzle ORM).
// Oyun içeriği (yetenekler, perkler, augmentler) veritabanında DEĞİL,
// content/shz.json içinde durur; burada yalnızca oyuncu verisi tutulur.
import { randomUUID } from "node:crypto";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { BandageKey, StatKey, WoundKey } from "../lib/shz/constants";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["GM", "PLAYER"]);
export const characterStatusEnum = pgEnum("character_status", ["PENDING", "ACTIVE", "REJECTED", "DEAD", "RETIRED"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["ACTIVE", "PAUSED", "ARCHIVED"]);
export const channelEnum = pgEnum("message_channel", ["IC", "OOC", "WHISPER", "SYSTEM"]);

export type Role = (typeof roleEnum.enumValues)[number];
export type CharacterStatus = (typeof characterStatusEnum.enumValues)[number];
export type Channel = (typeof channelEnum.enumValues)[number];

export const users = pgTable("users", {
  id: id(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("PLAYER"),
  /** Site yöneticisi: kullanıcıları yönetir, GM daveti üretebilir. */
  isAdmin: boolean("is_admin").notNull().default(false),
  disabled: boolean("disabled").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: created(),
});

/** Sunucu tarafı oturum. Çerezde rastgele token, burada yalnızca SHA-256 özeti tutulur. */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: created(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Giriş denemesi sınırlaması (IP ve kullanıcı adı bazlı). */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: id(),
    key: text("key").notNull(),
    createdAt: created(),
  },
  (t) => [index("login_attempts_key_idx").on(t.key, t.createdAt)],
);

export const campaigns = pgTable("campaigns", {
  id: id(),
  name: text("name").notNull(),
  contentKey: text("content_key"),
  description: text("description").notNull().default(""),
  status: campaignStatusEnum("status").notNull().default("ACTIVE"),
  gmId: text("gm_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  joinCode: text("join_code").notNull().unique(),
  startPerkPoints: integer("start_perk_points").notNull().default(0),
  levelCap: integer("level_cap").notNull().default(10),
  deathSaveEnabled: boolean("death_save_enabled").notNull().default(true),
  createdAt: created(),
});

/** Hesap daveti. Kod yalnızca oluşturulduğunda bir kez gösterilir; burada özeti tutulur. */
export const invites = pgTable("invites", {
  id: id(),
  codeHash: text("code_hash").notNull().unique(),
  hint: text("hint").notNull(),
  note: text("note"),
  role: roleEnum("role").notNull().default("PLAYER"),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  usedById: text("used_by_id").references(() => users.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: created(),
});

export const campaignMembers = pgTable(
  "campaign_members",
  {
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    /** GM tarafından sohbette susturuldu */
    chatMuted: boolean("chat_muted").notNull().default(false),
    /** GM tarafından zar atmada susturuldu */
    rollMuted: boolean("roll_muted").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.userId] }), index("members_user_idx").on(t.userId)],
);

export type Stats = Record<StatKey, number>;
export interface BodyPartState {
  wound: WoundKey;
  bandage: BandageKey;
  augment: string | null;
  note: string;
}
export type Body = Partial<Record<string, BodyPartState>>;
export interface DeathSave {
  available: boolean;
  resets: number;
  deaths: number;
  saves: number;
}
export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  note: string;
}

export const characters = pgTable(
  "characters",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: characterStatusEnum("status").notNull().default("PENDING"),
    reviewNote: text("review_note"),

    name: text("name").notNull(),
    age: integer("age").notNull(),
    nationality: text("nationality").notNull(),
    alignment: text("alignment").notNull(),
    background: text("background").notNull().default(""),
    appearance: text("appearance").notNull().default(""),

    level: integer("level").notNull().default(0),
    abilityPoints: integer("ability_points").notNull().default(1),
    freeStatPoints: integer("free_stat_points").notNull().default(0),
    stats: jsonb("stats").$type<Stats>().notNull(),
    trees: text("trees").array().notNull().default([]),
    abilities: jsonb("abilities").$type<Record<string, number>>().notNull().default({}),
    perks: text("perks").array().notNull().default([]),
    body: jsonb("body").$type<Body>().notNull().default({}),
    corruption: integer("corruption").notNull().default(0),
    corruptionLocked: boolean("corruption_locked").notNull().default(false),
    inspiration: integer("inspiration").notNull().default(0),
    deathSave: jsonb("death_save").$type<DeathSave>().notNull().default({ available: true, resets: 0, deaths: 0, saves: 0 }),
    money: integer("money").notNull().default(0),
    inventory: jsonb("inventory").$type<InventoryItem[]>().notNull().default([]),
    notes: text("notes").notNull().default(""),
    /** Oyuncunun yalnızca GM ile paylaştığı gizli geçmiş / lore. Diğer oyuncular görmez. */
    secretNotes: text("secret_notes").notNull().default(""),
    /** Portre yüklüyse sürüm damgası (önbellek kırmak için). */
    portraitVersion: integer("portrait_version").notNull().default(0),
    /** GM izni: oyuncu perklerini bir kez yeniden düzenleyebilir. */
    perkEditAllowed: boolean("perk_edit_allowed").notNull().default(false),
    gmNotes: text("gm_notes").notNull().default(""),
    createdAt: created(),
    // milisaniye hassasiyeti: koşullu güncellemelerde (yarış koruması) JS Date ile birebir eşleşir
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("characters_campaign_idx").on(t.campaignId), index("characters_user_idx").on(t.userId)],
);

export const characterLogs = pgTable(
  "character_logs",
  {
    id: id(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    createdAt: created(),
  },
  (t) => [index("logs_character_idx").on(t.characterId, t.createdAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    characterId: text("character_id").references(() => characters.id, { onDelete: "set null" }),
    recipientId: text("recipient_id").references(() => users.id, { onDelete: "set null" }),
    channel: channelEnum("channel").notNull(),
    content: text("content").notNull(),
    createdAt: created(),
  },
  (t) => [index("messages_campaign_idx").on(t.campaignId, t.createdAt)],
);

export interface RollPart {
  label: string;
  value: number;
}
export interface RollDetail {
  parts: RollPart[];
  total: number;
  threshold: number | null;
  thresholdLabel: string | null;
  outcome: "success" | "fail" | "crit-success" | "crit-fail" | "death" | "save" | "info";
  note?: string;
  rerollOf?: string;
  requestId?: string;
  /** Death Save ilerlemesi (zar kartında gösterilir). */
  deathTrack?: { deaths: number; saves: number; final: "death" | "save" | null };
  /** Zarı kimin istediği / hangi isteğe yanıt olduğu. */
  requested?: boolean;
}

export const rolls = pgTable(
  "rolls",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    characterId: text("character_id").references(() => characters.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    label: text("label").notNull(),
    dice: integer("dice").array().notNull(),
    detail: jsonb("detail").$type<RollDetail>().notNull(),
    hidden: boolean("hidden").notNull().default(false),
    rerolled: boolean("rerolled").notNull().default(false),
    createdAt: created(),
  },
  (t) => [index("rolls_campaign_idx").on(t.campaignId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Roll = typeof rolls.$inferSelect;


const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** Karakter portresi: sunucuda yeniden kodlanmış WebP (en fazla 512 px). */
export const portraits = pgTable("portraits", {
  characterId: text("character_id")
    .primaryKey()
    .references(() => characters.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
