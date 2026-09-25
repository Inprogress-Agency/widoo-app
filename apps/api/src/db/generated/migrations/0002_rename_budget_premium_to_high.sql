-- Written by hand (drizzle-kit generate --custom): drizzle-kit would drop and recreate the type
-- to rename a value. The highest budget bucket is `high`, `premium` being the subscription and the
-- signature routes (D-016). Existing rows follow the renamed label; the `plan` enum is unchanged.
-- Rollback, together with the code that reads `premium`: RENAME VALUE 'high' TO 'premium'.
ALTER TYPE "public"."budget_bucket" RENAME VALUE 'premium' TO 'high';
