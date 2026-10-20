CREATE TYPE "public"."b2b_client_status" AS ENUM('prospect', 'active', 'suspended', 'ended');--> statement-breakpoint
CREATE TYPE "public"."b2b_client_type" AS ENUM('hotel', 'concierge', 'tourist_office', 'other');--> statement-breakpoint
CREATE TABLE "b2b_client_routes" (
	"client_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "b2b_client_routes_client_id_route_id_pk" PRIMARY KEY("client_id","route_id"),
	CONSTRAINT "b2b_client_routes_position_unique" UNIQUE("client_id","position"),
	CONSTRAINT "b2b_client_routes_position_check" CHECK ("b2b_client_routes"."position" between 0 and 9)
);
--> statement-breakpoint
CREATE TABLE "b2b_clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "b2b_client_type" NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"status" "b2b_client_status" DEFAULT 'prospect' NOT NULL,
	"monthly_price_cents" integer,
	"started_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_clients_slug_unique" UNIQUE("slug"),
	CONSTRAINT "b2b_clients_slug_check" CHECK ("b2b_clients"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "b2b_clients_price_check" CHECK ("b2b_clients"."monthly_price_cents" is null or "b2b_clients"."monthly_price_cents" between 0 and 10000000)
);
--> statement-breakpoint
ALTER TABLE "b2b_client_routes" ADD CONSTRAINT "b2b_client_routes_client_id_b2b_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."b2b_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_client_routes" ADD CONSTRAINT "b2b_client_routes_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "b2b_client_routes_route_idx" ON "b2b_client_routes" USING btree ("route_id");