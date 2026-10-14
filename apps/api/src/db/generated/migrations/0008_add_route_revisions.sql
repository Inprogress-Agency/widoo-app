CREATE TYPE "public"."route_revision_status" AS ENUM('draft', 'pending', 'changes_requested', 'rejected', 'published');--> statement-breakpoint
CREATE TABLE "route_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"route_id" uuid NOT NULL,
	"author_id" uuid,
	"status" "route_revision_status" DEFAULT 'draft' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "route_revisions" ADD CONSTRAINT "route_revisions_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_revisions" ADD CONSTRAINT "route_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "route_revisions_one_open_idx" ON "route_revisions" USING btree ("route_id") WHERE "route_revisions"."status" in ('draft', 'pending', 'changes_requested');--> statement-breakpoint
CREATE INDEX "route_revisions_route_idx" ON "route_revisions" USING btree ("route_id","created_at");