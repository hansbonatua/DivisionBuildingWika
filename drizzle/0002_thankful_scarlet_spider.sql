CREATE TABLE "program_kerja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"start_month" integer NOT NULL,
	"end_month" integer NOT NULL,
	"parameter" text NOT NULL,
	"unit" text NOT NULL,
	"monitor" text,
	"note" text,
	"evidence_url" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_kerja_year_check" CHECK ("program_kerja"."year" >= 2000),
	CONSTRAINT "program_kerja_start_month_check" CHECK ("program_kerja"."start_month" BETWEEN 1 AND 12),
	CONSTRAINT "program_kerja_end_month_check" CHECK ("program_kerja"."end_month" BETWEEN 1 AND 12),
	CONSTRAINT "program_kerja_period_check" CHECK ("program_kerja"."start_month" <= "program_kerja"."end_month"),
	CONSTRAINT "program_kerja_unit_check" CHECK ("program_kerja"."unit" in ('Jumlah', 'Persentase'))
);
--> statement-breakpoint
CREATE TABLE "program_kerja_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_kerja_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "program_kerja_monthly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_kerja_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"ra_value" numeric NOT NULL,
	"ri_value" numeric,
	"ri_updated_by" uuid,
	"ri_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_kerja_monthly_program_month_unique" UNIQUE("program_kerja_id","month"),
	CONSTRAINT "program_kerja_monthly_month_check" CHECK ("program_kerja_monthly"."month" BETWEEN 1 AND 12),
	CONSTRAINT "program_kerja_monthly_ra_check" CHECK ("program_kerja_monthly"."ra_value" >= 0),
	CONSTRAINT "program_kerja_monthly_ri_check" CHECK ("program_kerja_monthly"."ri_value" IS NULL OR "program_kerja_monthly"."ri_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "program_kerja_pics" (
	"program_kerja_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_kerja_pics_program_kerja_id_user_id_pk" PRIMARY KEY("program_kerja_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "program_kerja" ADD CONSTRAINT "program_kerja_group_id_program_kerja_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."program_kerja_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_kerja" ADD CONSTRAINT "program_kerja_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_kerja_monthly" ADD CONSTRAINT "program_kerja_monthly_program_kerja_id_program_kerja_id_fk" FOREIGN KEY ("program_kerja_id") REFERENCES "public"."program_kerja"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_kerja_monthly" ADD CONSTRAINT "program_kerja_monthly_ri_updated_by_users_id_fk" FOREIGN KEY ("ri_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_kerja_pics" ADD CONSTRAINT "program_kerja_pics_program_kerja_id_program_kerja_id_fk" FOREIGN KEY ("program_kerja_id") REFERENCES "public"."program_kerja"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_kerja_pics" ADD CONSTRAINT "program_kerja_pics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_kerja_group_id_idx" ON "program_kerja" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "program_kerja_year_idx" ON "program_kerja" USING btree ("year");--> statement-breakpoint
CREATE INDEX "program_kerja_created_by_idx" ON "program_kerja" USING btree ("created_by");