CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_evidence_link" (
	"id" text PRIMARY KEY NOT NULL,
	"essay_id" text NOT NULL,
	"evidence_card_id" text NOT NULL,
	"user_id" text NOT NULL,
	"claim_text" text NOT NULL,
	"anchor_block_index" integer NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "essay" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "essay_version" (
	"id" text PRIMARY KEY NOT NULL,
	"essay_id" text NOT NULL,
	"user_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_card" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_url" text NOT NULL,
	"source_title" text NOT NULL,
	"quote_snippet" text,
	"user_summary" text,
	"caveats" text,
	"stance" text DEFAULT 'supports' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence_link" ADD CONSTRAINT "claim_evidence_link_essay_id_essay_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essay"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence_link" ADD CONSTRAINT "claim_evidence_link_evidence_card_id_evidence_card_id_fk" FOREIGN KEY ("evidence_card_id") REFERENCES "public"."evidence_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence_link" ADD CONSTRAINT "claim_evidence_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay" ADD CONSTRAINT "essay_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_version" ADD CONSTRAINT "essay_version_essay_id_essay_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essay"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_version" ADD CONSTRAINT "essay_version_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_card" ADD CONSTRAINT "evidence_card_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_evidence_link_essay_id_idx" ON "claim_evidence_link" USING btree ("essay_id");--> statement-breakpoint
CREATE INDEX "claim_evidence_link_evidence_card_id_idx" ON "claim_evidence_link" USING btree ("evidence_card_id");--> statement-breakpoint
CREATE INDEX "essay_user_id_idx" ON "essay" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "essay_version_essay_id_version_number_unique" ON "essay_version" USING btree ("essay_id","version_number");--> statement-breakpoint
CREATE INDEX "essay_version_essay_id_idx" ON "essay_version" USING btree ("essay_id");--> statement-breakpoint
CREATE INDEX "evidence_card_user_id_idx" ON "evidence_card" USING btree ("user_id");