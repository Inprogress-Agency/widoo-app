CREATE TYPE "public"."media_source" AS ENUM('upload', 'commons');--> statement-breakpoint
ALTER TYPE "public"."verification_status" ADD VALUE 'unverified' BEFORE 'verified';--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "source" "media_source" DEFAULT 'upload' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "author" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "license" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "always_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "suggested_start" time;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "tips" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "tips_hidden" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "booking_note" text;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "booking_is_affiliate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_credit_check" CHECK (("media"."source" = 'upload'
          and "media"."author" is null and "media"."license" is null and "media"."source_url" is null)
        or ("media"."source" = 'commons'
          and coalesce("media"."author", '') <> '' and coalesce("media"."license", '') <> ''
          and coalesce("media"."source_url", '') like 'https://%'));--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_title_length_check" CHECK (char_length("routes"."title") <= 60);--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_tips_check" CHECK ((cardinality("routes"."tips") = 0 or (array_ndims("routes"."tips") = 1
    and array_position("routes"."tips", null) is null
    and array_position("routes"."tips", '') is null)) and cardinality("routes"."tips") <= 3);--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_tips_hidden_check" CHECK ((cardinality("routes"."tips_hidden") = 0 or (array_ndims("routes"."tips_hidden") = 1
    and array_position("routes"."tips_hidden", null) is null
    and array_position("routes"."tips_hidden", '') is null)));--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_description_length_check" CHECK (char_length("steps"."description") <= 600);--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_booking_note_length_check" CHECK (char_length("steps"."booking_note") <= 80);--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_booking_affiliate_check" CHECK (not "steps"."booking_is_affiliate" or "steps"."booking_url" is not null);