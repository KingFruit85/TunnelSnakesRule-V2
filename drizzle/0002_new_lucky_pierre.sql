ALTER TYPE "public"."win_condition" ADD VALUE 'hidden_traitor';--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD COLUMN "role_one_label" text;--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD COLUMN "role_two_label" text;--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD COLUMN "neither_label" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "role_one_label" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "role_two_label" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "neither_label" text;--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD CONSTRAINT "club_game_variants_hidden_traitor_labels_required" CHECK (("club_game_variants"."win_condition" = 'hidden_traitor'
            AND "club_game_variants"."role_one_label" IS NOT NULL
            AND "club_game_variants"."role_two_label" IS NOT NULL
            AND "club_game_variants"."neither_label" IS NOT NULL)
          OR ("club_game_variants"."win_condition" <> 'hidden_traitor'
            AND "club_game_variants"."role_one_label" IS NULL
            AND "club_game_variants"."role_two_label" IS NULL
            AND "club_game_variants"."neither_label" IS NULL));--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_hidden_traitor_labels_required" CHECK (("games"."win_condition" = 'hidden_traitor'
            AND "games"."role_one_label" IS NOT NULL
            AND "games"."role_two_label" IS NOT NULL
            AND "games"."neither_label" IS NOT NULL)
          OR ("games"."win_condition" <> 'hidden_traitor'
            AND "games"."role_one_label" IS NULL
            AND "games"."role_two_label" IS NULL
            AND "games"."neither_label" IS NULL));