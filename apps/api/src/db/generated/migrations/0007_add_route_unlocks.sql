CREATE TABLE "route_unlocks" (
	"user_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"store_transaction_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "route_unlocks_pkey" PRIMARY KEY("user_id","route_id"),
	CONSTRAINT "route_unlocks_store_transaction_id_unique" UNIQUE("store_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "route_unlocks" ADD CONSTRAINT "route_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_unlocks" ADD CONSTRAINT "route_unlocks_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "route_unlocks_route_idx" ON "route_unlocks" USING btree ("route_id");