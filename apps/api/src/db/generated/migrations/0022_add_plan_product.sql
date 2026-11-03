CREATE TYPE "public"."plan_product" AS ENUM('monthly', 'annual', 'pass_7d');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_product" "plan_product";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_will_renew" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_plan_product_check" CHECK ("users"."plan_product" is null or ("users"."plan" = 'premium' and "users"."plan_source" = 'store'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_plan_will_renew_check" CHECK (not "users"."plan_will_renew" or ("users"."plan_product" is not null
        and ("users"."plan_product" in ('monthly', 'annual'))));