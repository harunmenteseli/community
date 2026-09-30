CREATE TYPE "public"."post_game" AS ENUM('ea-fc', 'efootball', 'football-manager');--> statement-breakpoint
DROP TABLE "oauth_accounts" CASCADE;--> statement-breakpoint
DROP TABLE "user_tools" CASCADE;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "game" "post_game";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "github_username";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "is_open_source";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "github_url";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "category" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "public"."posts" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."post_category";--> statement-breakpoint
CREATE TYPE "public"."post_category" AS ENUM('soru', 'oneri', 'kariyer', 'bug', 'genel');--> statement-breakpoint
ALTER TABLE "public"."posts" ALTER COLUMN "category" SET DATA TYPE "public"."post_category" USING "category"::"public"."post_category";--> statement-breakpoint
ALTER TABLE "public"."posts" ALTER COLUMN "category" SET DEFAULT 'genel'::"public"."post_category";