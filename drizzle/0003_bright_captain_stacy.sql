CREATE TABLE "inference_attempt" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stage" text NOT NULL,
	"sprint_id" uuid,
	"input_hash" text NOT NULL,
	"prompt_version" text NOT NULL,
	"model_id" text NOT NULL,
	"outcome" text NOT NULL,
	"retry_count" integer NOT NULL,
	"candidates_returned" integer,
	"candidates_valid" integer,
	"reject_reasons" text,
	"latency_ms" integer NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spark_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"sprint_id" uuid NOT NULL,
	"type" text NOT NULL,
	"detail" text,
	"lens" text,
	"question" text,
	"draft_word_count" integer NOT NULL,
	"sprint_elapsed_ms" integer NOT NULL,
	"cache_age_ms" integer,
	"words_since_prepare" integer,
	"prompt_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inference_attempt" ADD CONSTRAINT "inference_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spark_event" ADD CONSTRAINT "spark_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spark_event_user_sprint_idx" ON "spark_event" USING btree ("user_id","sprint_id");