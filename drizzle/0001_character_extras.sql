CREATE TABLE "portraits" (
	"character_id" text PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "secret_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "portrait_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "portraits" ADD CONSTRAINT "portraits_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;