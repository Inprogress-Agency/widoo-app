CREATE TYPE "public"."plan_source" AS ENUM('store', 'gift');--> statement-breakpoint
ALTER TABLE "route_unlocks" ALTER COLUMN "store_transaction_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "route_unlocks" ADD COLUMN "source" "plan_source" DEFAULT 'store' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_source" "plan_source" DEFAULT 'store' NOT NULL;--> statement-breakpoint
ALTER TABLE "route_unlocks" ADD CONSTRAINT "route_unlocks_transaction_check" CHECK ("route_unlocks"."source" = 'gift' or "route_unlocks"."store_transaction_id" is not null);