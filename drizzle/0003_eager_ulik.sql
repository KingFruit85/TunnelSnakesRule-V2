ALTER TYPE "public"."win_condition" ADD VALUE 'team_scored';--> statement-breakpoint
COMMIT;--> statement-breakpoint
BEGIN;--> statement-breakpoint
ALTER TABLE "club_game_variants" DROP CONSTRAINT "club_game_variants_scoring_direction_matches_win_condition";--> statement-breakpoint
ALTER TABLE "games" DROP CONSTRAINT "games_scoring_direction_matches_win_condition";--> statement-breakpoint
ALTER TABLE "team_results" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD CONSTRAINT "club_game_variants_scoring_direction_matches_win_condition" CHECK (("club_game_variants"."win_condition" IN ('leaderboard', 'team_scored') AND "club_game_variants"."scoring_direction" IS NOT NULL)
          OR ("club_game_variants"."win_condition" NOT IN ('leaderboard', 'team_scored') AND "club_game_variants"."scoring_direction" IS NULL));--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_scoring_direction_matches_win_condition" CHECK (("games"."win_condition" IN ('leaderboard', 'team_scored') AND "games"."scoring_direction" IS NOT NULL)
          OR ("games"."win_condition" NOT IN ('leaderboard', 'team_scored') AND "games"."scoring_direction" IS NULL));
