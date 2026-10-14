ALTER TYPE "public"."media_owner_type" ADD VALUE 'step';--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "highlights" text[];--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "audio_path" text;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "audio_duration_s" smallint;--> statement-breakpoint
CREATE UNIQUE INDEX "media_step_position_idx" ON "media" USING btree ("owner_id","position") WHERE "media"."owner_type" not in ('route', 'place');--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_step_position_check" CHECK ("media"."owner_type" in ('route', 'place')
        or "media"."position" between 0 and 4);--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_highlights_check" CHECK ("steps"."highlights" is null or (array_ndims("steps"."highlights") = 1
        and cardinality("steps"."highlights") between 1 and 3
        and array_position("steps"."highlights", null) is null
        and array_position("steps"."highlights", '') is null));--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_audio_check" CHECK (("steps"."audio_path" is null and "steps"."audio_duration_s" is null)
        or ("steps"."audio_path" is not null and "steps"."audio_duration_s" is not null and "steps"."audio_duration_s" > 0));