CREATE TYPE "public"."planned_route_closer" AS ENUM('user', 'auto');--> statement-breakpoint
CREATE TYPE "public"."planned_route_status" AS ENUM('planned', 'in_progress', 'completed', 'stopped', 'cancelled', 'missed');--> statement-breakpoint
CREATE TABLE "planned_routes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"route_id" uuid,
	"route_revision_snapshot" jsonb NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"status" "planned_route_status" DEFAULT 'planned' NOT NULL,
	"timeline" jsonb NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"closed_by" "planned_route_closer",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planned_routes_closed_by_check" CHECK ("planned_routes"."closed_by" is null or "planned_routes"."status" in ('completed', 'stopped')),
	CONSTRAINT "planned_routes_completed_at_check" CHECK ("planned_routes"."completed_at" is null or "planned_routes"."status" = 'completed')
);
--> statement-breakpoint
CREATE TABLE "planned_steps" (
	"planned_route_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"arrived_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	CONSTRAINT "planned_steps_pkey" PRIMARY KEY("planned_route_id","step_id"),
	CONSTRAINT "planned_steps_route_position_unique" UNIQUE("planned_route_id","position"),
	CONSTRAINT "planned_steps_done_or_skipped_check" CHECK ("planned_steps"."done_at" is null or "planned_steps"."skipped_at" is null)
);
--> statement-breakpoint
ALTER TABLE "planned_routes" ADD CONSTRAINT "planned_routes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_routes" ADD CONSTRAINT "planned_routes_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_steps" ADD CONSTRAINT "planned_steps_planned_route_id_planned_routes_id_fk" FOREIGN KEY ("planned_route_id") REFERENCES "public"."planned_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "planned_routes_user_starts_idx" ON "planned_routes" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE INDEX "planned_routes_route_status_idx" ON "planned_routes" USING btree ("route_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "planned_routes_one_in_progress_idx" ON "planned_routes" USING btree ("user_id") WHERE "planned_routes"."status" = 'in_progress';