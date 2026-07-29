CREATE TABLE "constellation_node" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"star_id" text NOT NULL,
	"kind" text NOT NULL,
	"tier" text NOT NULL,
	"payoff" text NOT NULL,
	"body" text NOT NULL,
	"grounding" text NOT NULL,
	"crux_score" integer NOT NULL,
	"rank" integer NOT NULL,
	"visible" boolean NOT NULL,
	"status" text DEFAULT 'unseen' NOT NULL,
	"reaction" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status_changed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "constellation_run" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"sprint_id" uuid NOT NULL,
	"run_key" text NOT NULL,
	"status" text NOT NULL,
	"failed_stage" text,
	"error_reason" text,
	"brief" text,
	"confidence" text,
	"crux_star_id" text,
	"draft_word_count" integer NOT NULL,
	"prompt_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"model_id" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "constellation_star" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"intent" text NOT NULL,
	"weight" integer NOT NULL,
	"grounding" text NOT NULL,
	"rank" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inference_attempt" ADD COLUMN "cached_input_tokens" integer;--> statement-breakpoint
ALTER TABLE "inference_attempt" ADD COLUMN "run_id" uuid;--> statement-breakpoint
ALTER TABLE "constellation_node" ADD CONSTRAINT "constellation_node_run_id_constellation_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."constellation_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constellation_node" ADD CONSTRAINT "constellation_node_star_id_constellation_star_id_fk" FOREIGN KEY ("star_id") REFERENCES "public"."constellation_star"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constellation_run" ADD CONSTRAINT "constellation_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constellation_star" ADD CONSTRAINT "constellation_star_run_id_constellation_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."constellation_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "constellation_node_run_idx" ON "constellation_node" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "constellation_run_user_key_idx" ON "constellation_run" USING btree ("user_id","run_key");--> statement-breakpoint
CREATE INDEX "constellation_run_user_sprint_idx" ON "constellation_run" USING btree ("user_id","sprint_id");--> statement-breakpoint
CREATE INDEX "constellation_star_run_idx" ON "constellation_star" USING btree ("run_id");