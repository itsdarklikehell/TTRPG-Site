CREATE TYPE "public"."member_role" AS ENUM('PLAYER', 'SPECTATOR');--> statement-breakpoint
ALTER TABLE "campaign_members" ADD COLUMN "role" "member_role" DEFAULT 'PLAYER' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "spectator_code" text;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "member_role" "member_role" DEFAULT 'PLAYER' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_spectator_code_unique" UNIQUE("spectator_code");