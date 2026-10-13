-- Additive (#126, D-023, D-026): a new type, three new tables and four nullable or defaulted
-- columns of users, which existing rows take without a rewrite. The bio check holds on every
-- existing row: no endpoint writes the bio yet, and the seed bios are under 150 characters.
-- The eight anecdote questions of Ecrans › E-09 are reference data that production needs, where
-- the seed is refused: inserted here, and again by the seed, which keeps an edited label.
-- Rollback, together with the code that reads them: DROP TABLE "user_featured_routes";
-- DROP TABLE "user_anecdotes"; DROP TABLE "anecdote_questions";
-- ALTER TABLE "users" DROP CONSTRAINT "users_bio_length_check", DROP COLUMN "neighborhood",
-- DROP COLUMN "is_certified", DROP COLUMN "certified_override", DROP COLUMN "certified_at";
-- DROP TYPE "public"."certified_override"; then delete the row of this migration from
-- drizzle.__drizzle_migrations. Dropping them erases the anecdotes and featured routes written since.
CREATE TYPE "public"."certified_override" AS ENUM('none', 'granted', 'revoked');--> statement-breakpoint
CREATE TABLE "anecdote_questions" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"position" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "anecdote_questions_key_check" CHECK ("anecdote_questions"."key" ~ '^[a-z0-9]+(_[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "user_anecdotes" (
	"user_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"answer" text NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "user_anecdotes_pkey" PRIMARY KEY("user_id","position"),
	CONSTRAINT "user_anecdotes_user_question_unique" UNIQUE("user_id","question_key"),
	CONSTRAINT "user_anecdotes_position_check" CHECK ("user_anecdotes"."position" between 1 and 3),
	CONSTRAINT "user_anecdotes_answer_length_check" CHECK (char_length("user_anecdotes"."answer") between 1 and 150)
);
--> statement-breakpoint
CREATE TABLE "user_featured_routes" (
	"user_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "user_featured_routes_pkey" PRIMARY KEY("user_id","position"),
	CONSTRAINT "user_featured_routes_user_route_unique" UNIQUE("user_id","route_id"),
	CONSTRAINT "user_featured_routes_position_check" CHECK ("user_featured_routes"."position" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "neighborhood" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_certified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "certified_override" "certified_override" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "certified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_anecdotes" ADD CONSTRAINT "user_anecdotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_anecdotes" ADD CONSTRAINT "user_anecdotes_question_key_anecdote_questions_key_fk" FOREIGN KEY ("question_key") REFERENCES "public"."anecdote_questions"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_featured_routes" ADD CONSTRAINT "user_featured_routes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_featured_routes" ADD CONSTRAINT "user_featured_routes_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_featured_routes_route_idx" ON "user_featured_routes" USING btree ("route_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_bio_length_check" CHECK (char_length("users"."bio") <= 150);--> statement-breakpoint
INSERT INTO "anecdote_questions" ("key", "label", "position") VALUES
	('stroll_neighborhood', 'Mon quartier pour flâner', 1),
	('ideal_sunday', 'Ma sortie idéale un dimanche', 2),
	('hidden_gem', 'Un bon plan que personne ne connaît', 3),
	('best_memory', 'Mon meilleur souvenir à Paris', 4),
	('friends_visiting', 'Là où j''emmène mes amis de passage', 5),
	('summer_must', 'Ce que je ne rate jamais en été', 6),
	('work_cafe', 'Mon café pour lire ou travailler', 7),
	('favorite_street', 'Une rue que j''aime sans savoir pourquoi', 8)
ON CONFLICT ("key") DO NOTHING;
