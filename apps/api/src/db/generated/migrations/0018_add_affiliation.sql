CREATE TYPE "public"."link_origin" AS ENUM('creator', 'creator_affiliate', 'partner');--> statement-breakpoint
CREATE TABLE "affiliate_programs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"network" text NOT NULL,
	"commission_note" text,
	"cookie_days" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_programs_name_unique" UNIQUE("name"),
	CONSTRAINT "affiliate_programs_cookie_days_check" CHECK ("affiliate_programs"."cookie_days" between 0 and 365)
);
--> statement-breakpoint
CREATE TABLE "booking_clicks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"step_id" uuid NOT NULL,
	"user_id" uuid,
	"link_origin" "link_origin" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "partner_booking_url" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "partner_program_id" uuid;--> statement-breakpoint
ALTER TABLE "booking_clicks" ADD CONSTRAINT "booking_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_clicks_step_idx" ON "booking_clicks" USING btree ("step_id","created_at");--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_partner_program_id_affiliate_programs_id_fk" FOREIGN KEY ("partner_program_id") REFERENCES "public"."affiliate_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_partner_link_check" CHECK (("places"."partner_booking_url" is null or "places"."partner_booking_url" like 'https://%')
        and ("places"."partner_program_id" is null or "places"."partner_booking_url" is not null));