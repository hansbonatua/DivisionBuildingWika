CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_logs_action_check" CHECK ("activity_logs"."action" in ('CREATE', 'UPDATE', 'DELETE', 'SIGN', 'REJECT', 'REVISE')),
	CONSTRAINT "activity_logs_entity_type_check" CHECK ("activity_logs"."entity_type" in ('BERKAS', 'MASTER_PROJECT', 'PDOC')),
	CONSTRAINT "activity_logs_title_check" CHECK (length(btrim("activity_logs"."title")) between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at" desc);--> statement-breakpoint
CREATE INDEX "activity_logs_actor_created_at_idx" ON "activity_logs" USING btree ("actor_user_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "activity_logs_entity_created_at_idx" ON "activity_logs" USING btree ("entity_type","created_at" desc);