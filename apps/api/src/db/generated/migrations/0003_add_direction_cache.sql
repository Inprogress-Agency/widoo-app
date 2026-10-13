-- Additive: a new type and a new table, which no existing row depends on (#34). The cache of
-- Mapbox Directions answers, written only when MAPBOX_DIRECTIONS_CACHE_DAYS is above 0.
-- Rollback, together with the code that reads it: DROP TABLE "direction_cache";
-- DROP TYPE "public"."directions_profile";
CREATE TYPE "public"."directions_profile" AS ENUM('walking', 'cycling', 'driving');--> statement-breakpoint
CREATE TABLE "direction_cache" (
	"profile" "directions_profile" NOT NULL,
	"from_lat_e5" integer NOT NULL,
	"from_lng_e5" integer NOT NULL,
	"to_lat_e5" integer NOT NULL,
	"to_lng_e5" integer NOT NULL,
	"distance_m" integer NOT NULL,
	"duration_s" integer NOT NULL,
	"geometry" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "direction_cache_pkey" PRIMARY KEY("profile","from_lat_e5","from_lng_e5","to_lat_e5","to_lng_e5"),
	CONSTRAINT "direction_cache_measures_check" CHECK ("direction_cache"."distance_m" >= 0 and "direction_cache"."duration_s" >= 0)
);
--> statement-breakpoint
CREATE INDEX "direction_cache_from_idx" ON "direction_cache" USING btree ("from_lat_e5","from_lng_e5");--> statement-breakpoint
CREATE INDEX "direction_cache_to_idx" ON "direction_cache" USING btree ("to_lat_e5","to_lng_e5");