ALTER TABLE "users" DROP CONSTRAINT "users_firebase_uid_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_firebase_uid_active_idx" ON "users" USING btree ("firebase_uid") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "users_firebase_uid_deleted_idx" ON "users" USING btree ("firebase_uid","deleted_at");