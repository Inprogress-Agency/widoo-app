CREATE TYPE "public"."place_signal_kind" AS ENUM('confirm', 'report');--> statement-breakpoint
CREATE TYPE "public"."place_signal_reason" AS ENUM('closed_today', 'closed_temporarily', 'closed_permanently', 'wrong_hours', 'wrong_address', 'works', 'crowded', 'not_as_described', 'other');--> statement-breakpoint
CREATE TABLE "place_signals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"place_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "place_signal_kind" NOT NULL,
	"reason" "place_signal_reason",
	"comment" text,
	"weight" numeric NOT NULL,
	"context_planned_route_id" uuid NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_signals_reason_check" CHECK (("place_signals"."kind" = 'report') = ("place_signals"."reason" is not null)),
	CONSTRAINT "place_signals_comment_check" CHECK ("place_signals"."comment" is null or ("place_signals"."reason" is not distinct from 'other' and btrim("place_signals"."comment") <> '' and char_length("place_signals"."comment") <= 80)),
	CONSTRAINT "place_signals_comment_required_check" CHECK ("place_signals"."comment" is not null or "place_signals"."reason" is distinct from 'other'),
	CONSTRAINT "place_signals_weight_check" CHECK ("place_signals"."weight" >= 0),
	CONSTRAINT "place_signals_review_check" CHECK (("place_signals"."status" = 'open') = ("place_signals"."reviewed_at" is null))
);
--> statement-breakpoint
ALTER TABLE "place_signals" ADD CONSTRAINT "place_signals_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_signals" ADD CONSTRAINT "place_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_signals" ADD CONSTRAINT "place_signals_context_planned_route_id_planned_routes_id_fk" FOREIGN KEY ("context_planned_route_id") REFERENCES "public"."planned_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_signals" ADD CONSTRAINT "place_signals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "place_signals_place_created_idx" ON "place_signals" USING btree ("place_id","created_at");--> statement-breakpoint
CREATE INDEX "place_signals_user_place_idx" ON "place_signals" USING btree ("user_id","place_id","created_at");--> statement-breakpoint
CREATE INDEX "place_signals_planned_route_idx" ON "place_signals" USING btree ("context_planned_route_id");