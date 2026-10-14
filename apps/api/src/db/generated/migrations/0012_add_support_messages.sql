CREATE TYPE "public"."support_topic" AS ENUM('question', 'problem', 'data', 'other');--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"reply_email" text NOT NULL,
	"topic" "support_topic" NOT NULL,
	"message" text NOT NULL,
	"app_version" text NOT NULL,
	"device" text NOT NULL,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone,
	CONSTRAINT "support_messages_message_length_check" CHECK (char_length("support_messages"."message") between 1 and 1000),
	CONSTRAINT "support_messages_locale_check" CHECK (("support_messages"."locale" in ('fr', 'en')))
);
--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_messages_user_idx" ON "support_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_messages_unhandled_idx" ON "support_messages" USING btree ("created_at") WHERE "support_messages"."handled_at" is null;