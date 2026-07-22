-- The tables below are the pre-Drizzle schema (no data left in any of them).
-- Dropped up front so the CREATE TABLEs for the new shape below can proceed;
-- CASCADE also removes their old indexes/constraints regardless of drop order.
DROP TABLE IF EXISTS "players_clubs" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "joinrequests" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "boardgames" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "gameresults" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "playerscores" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "games" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "sessions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "clubs" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "players" CASCADE;--> statement-breakpoint
CREATE TYPE "public"."scoring_direction" AS ENUM('high', 'low');--> statement-breakpoint
CREATE TYPE "public"."win_condition" AS ENUM('leaderboard', 'team_based', 'cooperative', 'single_winner', 'single_loser');--> statement-breakpoint
CREATE TABLE "club_game_variants" (
	"club_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"win_condition" "win_condition" NOT NULL,
	"scoring_direction" "scoring_direction",
	CONSTRAINT "club_game_variants_club_id_game_id_pk" PRIMARY KEY("club_id","game_id"),
	CONSTRAINT "club_game_variants_scoring_direction_matches_win_condition" CHECK (("club_game_variants"."win_condition" = 'leaderboard' AND "club_game_variants"."scoring_direction" IS NOT NULL)
          OR ("club_game_variants"."win_condition" <> 'leaderboard' AND "club_game_variants"."scoring_direction" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "club_members" (
	"player_id" uuid NOT NULL,
	"club_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_members_player_id_club_id_pk" PRIMARY KEY("player_id","club_id")
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"win_condition" "win_condition" NOT NULL,
	"scoring_direction" "scoring_direction",
	CONSTRAINT "games_scoring_direction_matches_win_condition" CHECK (("games"."win_condition" = 'leaderboard' AND "games"."scoring_direction" IS NOT NULL)
          OR ("games"."win_condition" <> 'leaderboard' AND "games"."scoring_direction" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"club_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_results" (
	"play_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "leaderboard_results_play_id_player_id_pk" PRIMARY KEY("play_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "outcome_results" (
	"play_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"won" boolean NOT NULL,
	CONSTRAINT "outcome_results_play_id_player_id_pk" PRIMARY KEY("play_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	CONSTRAINT "players_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text,
	"date" timestamp with time zone NOT NULL,
	"active" boolean NOT NULL,
	"notes" text,
	"image_urls" jsonb
);
--> statement-breakpoint
CREATE TABLE "team_results" (
	"play_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"team" text NOT NULL,
	"won" boolean NOT NULL,
	CONSTRAINT "team_results_play_id_player_id_pk" PRIMARY KEY("play_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD CONSTRAINT "club_game_variants_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD CONSTRAINT "club_game_variants_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_players_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_results" ADD CONSTRAINT "leaderboard_results_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_results" ADD CONSTRAINT "leaderboard_results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_results" ADD CONSTRAINT "outcome_results_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_results" ADD CONSTRAINT "outcome_results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_results" ADD CONSTRAINT "team_results_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_results" ADD CONSTRAINT "team_results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;