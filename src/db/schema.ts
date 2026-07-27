import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const winConditionEnum = pgEnum("win_condition", [
  "leaderboard",
  "team_based",
  "cooperative",
  "single_winner",
  "single_loser",
  "hidden_traitor",
  "team_scored",
]);

export const scoringDirectionEnum = pgEnum("scoring_direction", ["high", "low"]);

export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalId: text("external_id").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
});

export const clubs = pgTable("clubs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => players.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  avatar: text("avatar"),
});

export const clubMembers = pgTable(
  "club_members",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.playerId, table.clubId] })]
);

export const joinRequests = pgTable("join_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
});

export const games = pgTable(
  "games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    winCondition: winConditionEnum("win_condition").notNull(),
    scoringDirection: scoringDirectionEnum("scoring_direction"),
    roleOneLabel: text("role_one_label"),
    roleTwoLabel: text("role_two_label"),
    neitherLabel: text("neither_label"),
  },
  (table) => [
    check(
      "games_scoring_direction_matches_win_condition",
      sql`(${table.winCondition} IN ('leaderboard', 'team_scored') AND ${table.scoringDirection} IS NOT NULL)
          OR (${table.winCondition} NOT IN ('leaderboard', 'team_scored') AND ${table.scoringDirection} IS NULL)`
    ),
    check(
      "games_hidden_traitor_labels_required",
      sql`(${table.winCondition} = 'hidden_traitor'
            AND ${table.roleOneLabel} IS NOT NULL
            AND ${table.roleTwoLabel} IS NOT NULL
            AND ${table.neitherLabel} IS NOT NULL)
          OR (${table.winCondition} <> 'hidden_traitor'
            AND ${table.roleOneLabel} IS NULL
            AND ${table.roleTwoLabel} IS NULL
            AND ${table.neitherLabel} IS NULL)`
    ),
  ]
);

export const clubGameVariants = pgTable(
  "club_game_variants",
  {
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
    winCondition: winConditionEnum("win_condition").notNull(),
    scoringDirection: scoringDirectionEnum("scoring_direction"),
    roleOneLabel: text("role_one_label"),
    roleTwoLabel: text("role_two_label"),
    neitherLabel: text("neither_label"),
  },
  (table) => [
    primaryKey({ columns: [table.clubId, table.gameId] }),
    check(
      "club_game_variants_scoring_direction_matches_win_condition",
      sql`(${table.winCondition} IN ('leaderboard', 'team_scored') AND ${table.scoringDirection} IS NOT NULL)
          OR (${table.winCondition} NOT IN ('leaderboard', 'team_scored') AND ${table.scoringDirection} IS NULL)`
    ),
    check(
      "club_game_variants_hidden_traitor_labels_required",
      sql`(${table.winCondition} = 'hidden_traitor'
            AND ${table.roleOneLabel} IS NOT NULL
            AND ${table.roleTwoLabel} IS NOT NULL
            AND ${table.neitherLabel} IS NOT NULL)
          OR (${table.winCondition} <> 'hidden_traitor'
            AND ${table.roleOneLabel} IS NULL
            AND ${table.roleTwoLabel} IS NULL
            AND ${table.neitherLabel} IS NULL)`
    ),
  ]
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id),
  name: text("name"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  active: boolean("active").notNull(),
  notes: text("notes"),
  imageUrls: jsonb("image_urls"),
});

export const plays = pgTable("plays", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id),
  notes: text("notes"),
});

export const leaderboardResults = pgTable(
  "leaderboard_results",
  {
    playId: uuid("play_id")
      .notNull()
      .references(() => plays.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    score: integer("score").notNull(),
  },
  (table) => [primaryKey({ columns: [table.playId, table.playerId] })]
);

export const teamResults = pgTable(
  "team_results",
  {
    playId: uuid("play_id")
      .notNull()
      .references(() => plays.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    team: text("team").notNull(),
    score: integer("score"),
    won: boolean("won").notNull(),
  },
  (table) => [primaryKey({ columns: [table.playId, table.playerId] })]
);

export const outcomeResults = pgTable(
  "outcome_results",
  {
    playId: uuid("play_id")
      .notNull()
      .references(() => plays.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    won: boolean("won").notNull(),
  },
  (table) => [primaryKey({ columns: [table.playId, table.playerId] })]
);
