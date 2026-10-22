CREATE TABLE "template_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"file_url" text NOT NULL,
	"uploader_pic_user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_forms" ADD CONSTRAINT "template_forms_uploader_pic_user_id_users_id_fk" FOREIGN KEY ("uploader_pic_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_forms" ADD CONSTRAINT "template_forms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "template_forms_uploader_pic_user_id_idx" ON "template_forms" USING btree ("uploader_pic_user_id");--> statement-breakpoint
CREATE INDEX "template_forms_created_by_idx" ON "template_forms" USING btree ("created_by");