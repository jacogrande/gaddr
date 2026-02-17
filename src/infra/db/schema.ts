import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";

// ── Better Auth tables ──

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ── Application tables (Sprint 2+) ──

export const essay = pgTable("essay", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  publishedAt: timestamp("published_at"),
});

// ── Evidence tables (Sprint 5) ──

export const evidenceCard = pgTable("evidence_card", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  sourceUrl: text("source_url").notNull(),
  sourceTitle: text("source_title").notNull(),
  quoteSnippet: text("quote_snippet"),
  userSummary: text("user_summary"),
  caveats: text("caveats"),
  stance: text("stance", {
    enum: ["supports", "complicates", "contradicts"],
  })
    .notNull()
    .default("supports"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const claimEvidenceLink = pgTable("claim_evidence_link", {
  id: text("id").primaryKey(),
  essayId: text("essay_id")
    .notNull()
    .references(() => essay.id, { onDelete: "cascade" }),
  evidenceCardId: text("evidence_card_id")
    .notNull()
    .references(() => evidenceCard.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  claimText: text("claim_text").notNull(),
  anchorBlockIndex: integer("anchor_block_index").notNull(),
  createdAt: timestamp("created_at").notNull(),
});
