-- Written by hand (drizzle-kit generate --custom). Cloud SQL requires creating the extensions
-- explicitly; the postgis Docker image already has postgis, IF NOT EXISTS makes this a no-op there.
CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
