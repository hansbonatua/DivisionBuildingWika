CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"nip" text,
	"position" text NOT NULL,
	"photo_url" text,
	"role" text DEFAULT 'Project' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_nip_unique" UNIQUE("nip"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('Admin', 'Head Office', 'Project', 'Management')),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'suspended'))
);
