CREATE TYPE "public"."route_rating_status" AS ENUM('visible', 'hidden');--> statement-breakpoint
CREATE TABLE "route_ratings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"route_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"planned_route_id" uuid,
	"rating" smallint NOT NULL,
	"comment" text,
	"status" "route_rating_status" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "route_ratings_route_user_unique" UNIQUE("route_id","user_id"),
	CONSTRAINT "route_ratings_rating_check" CHECK ("route_ratings"."rating" between 1 and 5),
	CONSTRAINT "route_ratings_comment_check" CHECK ("route_ratings"."comment" is null or (btrim("route_ratings"."comment") <> '' and char_length("route_ratings"."comment") <= 280))
);
--> statement-breakpoint
ALTER TABLE "route_ratings" ADD CONSTRAINT "route_ratings_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_ratings" ADD CONSTRAINT "route_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_ratings" ADD CONSTRAINT "route_ratings_planned_route_id_planned_routes_id_fk" FOREIGN KEY ("planned_route_id") REFERENCES "public"."planned_routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "route_ratings_route_created_idx" ON "route_ratings" USING btree ("route_id","created_at","id");--> statement-breakpoint
CREATE INDEX "route_ratings_user_idx" ON "route_ratings" USING btree ("user_id");