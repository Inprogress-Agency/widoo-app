CREATE TYPE "public"."notification_kind" AS ENUM('go_closed', 'report_resolved');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."route_report_reason" AS ENUM('place_changed', 'inappropriate', 'dangerous_place', 'hidden_ad', 'copied_content', 'false_info', 'other', 'low_rating');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"sent_push_at" timestamp with time zone,
	"sent_email_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"route_id" uuid NOT NULL,
	"user_id" uuid,
	"reason" "route_report_reason" NOT NULL,
	"step_id" uuid,
	"comment" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "route_reports_reporter_check" CHECK (("route_reports"."user_id" is null) = ("route_reports"."reason" = 'low_rating')),
	CONSTRAINT "route_reports_step_check" CHECK (("route_reports"."step_id" is not null) = ("route_reports"."reason" in ('place_changed'))),
	CONSTRAINT "route_reports_comment_check" CHECK ("route_reports"."comment" is null or (("route_reports"."reason" in ('place_changed', 'other')) and btrim("route_reports"."comment") <> '' and char_length("route_reports"."comment") <= 80)),
	CONSTRAINT "route_reports_comment_required_check" CHECK ("route_reports"."comment" is not null or not ("route_reports"."reason" in ('other'))),
	CONSTRAINT "route_reports_review_check" CHECK (("route_reports"."status" = 'open') = ("route_reports"."reviewed_at" is null))
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_reports" ADD CONSTRAINT "route_reports_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_reports" ADD CONSTRAINT "route_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_reports" ADD CONSTRAINT "route_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "route_reports_route_user_idx" ON "route_reports" USING btree ("route_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "route_reports_open_idx" ON "route_reports" USING btree ("created_at") WHERE "route_reports"."status" = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX "route_reports_one_open_low_rating_idx" ON "route_reports" USING btree ("route_id") WHERE "route_reports"."reason" = 'low_rating' and "route_reports"."status" = 'open';