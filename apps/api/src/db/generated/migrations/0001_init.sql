CREATE TYPE "public"."booking_provider" AS ENUM('restaurant', 'ticketing', 'activity', 'other');--> statement-breakpoint
CREATE TYPE "public"."budget_bucket" AS ENUM('free', 'low', 'medium', 'premium');--> statement-breakpoint
CREATE TYPE "public"."duration_bucket" AS ENUM('1_2h', 'half_day', 'full_day', 'weekend');--> statement-breakpoint
CREATE TYPE "public"."media_owner_type" AS ENUM('route', 'place');--> statement-breakpoint
CREATE TYPE "public"."place_category" AS ENUM('restaurant', 'cafe', 'bar', 'bakery', 'museum', 'gallery', 'monument', 'park', 'viewpoint', 'shop', 'activity', 'event_venue', 'walk', 'other');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'premium');--> statement-breakpoint
CREATE TYPE "public"."price_range" AS ENUM('free', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."route_status" AS ENUM('draft', 'private', 'pending', 'changes_requested', 'published', 'needs_fix', 'rejected', 'unpublished');--> statement-breakpoint
CREATE TYPE "public"."transport" AS ENUM('walk', 'bike', 'metro', 'car');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'editor', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('verified', 'stale', 'flagged', 'closed');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"center" geography(Point,4326) NOT NULL,
	"bounds" geography(Polygon,4326) NOT NULL,
	"timezone" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_type" "media_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_hours" (
	"id" uuid PRIMARY KEY NOT NULL,
	"place_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"opens" time NOT NULL,
	"closes" time NOT NULL,
	"valid_from" date,
	"valid_to" date,
	CONSTRAINT "place_hours_weekday_check" CHECK ("place_hours"."weekday" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY NOT NULL,
	"city_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "place_category" NOT NULL,
	"location" geography(Point,4326) NOT NULL,
	"address" text NOT NULL,
	"address_components" jsonb,
	"is_indoor" boolean DEFAULT false NOT NULL,
	"price_range" "price_range",
	"website_url" text,
	"phone" text,
	"external_refs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verification_status" "verification_status" NOT NULL,
	"verified_at" timestamp with time zone,
	"confirmations_since_verified" numeric DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"city_id" uuid NOT NULL,
	"author_id" uuid,
	"is_official" boolean DEFAULT false NOT NULL,
	"status" "route_status" DEFAULT 'draft' NOT NULL,
	"access" "plan" DEFAULT 'free' NOT NULL,
	"sponsored" boolean DEFAULT false NOT NULL,
	"share_token" text,
	"title" text NOT NULL,
	"description" text,
	"moods" text[] DEFAULT '{}' NOT NULL,
	"audiences" text[] DEFAULT '{}' NOT NULL,
	"conditions" text[] DEFAULT '{}' NOT NULL,
	"transport" "transport" DEFAULT 'walk' NOT NULL,
	"start_location" geography(Point,4326),
	"bounds" geography(Polygon,4326),
	"computed" jsonb,
	"duration_bucket" "duration_bucket",
	"budget_bucket" "budget_bucket",
	"published_at" timestamp with time zone,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recommendation" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_share_token_unique" UNIQUE("share_token"),
	CONSTRAINT "routes_moods_check" CHECK ("routes"."moods" <@ ARRAY['culture', 'nature', 'shopping', 'food', 'romantic', 'unusual', 'instagrammable', 'relax', 'sport']::text[]),
	CONSTRAINT "routes_audiences_check" CHECK ("routes"."audiences" <@ ARRAY['solo', 'couple', 'family', 'friends', 'dog_friendly', 'kids_friendly']::text[]),
	CONSTRAINT "routes_conditions_check" CHECK ("routes"."conditions" <@ ARRAY['no_booking', 'wheelchair', 'indoor', 'outdoor', 'sunny', 'rainy']::text[])
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"route_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"place_id" uuid NOT NULL,
	"title" text,
	"description" text,
	"duration_min" smallint NOT NULL,
	"cost_per_person" numeric,
	"booking_required" boolean DEFAULT false NOT NULL,
	"booking_url" text,
	"booking_provider" "booking_provider",
	"transition_note" text,
	"transition" jsonb,
	CONSTRAINT "steps_route_position_unique" UNIQUE("route_id","position")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"email" text,
	"first_name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp with time zone,
	"revenuecat_app_user_id" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"bio" text,
	"trust_score" numeric DEFAULT 1 NOT NULL,
	"notification_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_hours" ADD CONSTRAINT "place_hours_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_owner_idx" ON "media" USING btree ("owner_type","owner_id","position");--> statement-breakpoint
CREATE INDEX "place_hours_place_idx" ON "place_hours" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "places_location_idx" ON "places" USING gist ("location");--> statement-breakpoint
CREATE INDEX "places_city_category_idx" ON "places" USING btree ("city_id","category");--> statement-breakpoint
CREATE INDEX "places_name_trgm_idx" ON "places" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "routes_bounds_idx" ON "routes" USING gist ("bounds");--> statement-breakpoint
CREATE INDEX "routes_start_location_idx" ON "routes" USING gist ("start_location");--> statement-breakpoint
CREATE INDEX "routes_city_status_idx" ON "routes" USING btree ("city_id","status");--> statement-breakpoint
CREATE INDEX "routes_moods_idx" ON "routes" USING gin ("moods");--> statement-breakpoint
CREATE INDEX "routes_audiences_idx" ON "routes" USING gin ("audiences");--> statement-breakpoint
CREATE INDEX "routes_conditions_idx" ON "routes" USING gin ("conditions");--> statement-breakpoint
CREATE INDEX "routes_duration_bucket_idx" ON "routes" USING btree ("duration_bucket");--> statement-breakpoint
CREATE INDEX "routes_budget_bucket_idx" ON "routes" USING btree ("budget_bucket");--> statement-breakpoint
CREATE INDEX "steps_place_idx" ON "steps" USING btree ("place_id");