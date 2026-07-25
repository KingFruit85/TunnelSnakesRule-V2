import { UUID } from "crypto";

// Reserved sentinel for the hidden_traitor win condition's "neither role
// won" outcome, submitted as the winner form field's value instead of a
// role's literal label text - keeps "nobody won" detection independent of
// whatever free-text label a club chose for roleOneLabel/roleTwoLabel.
export const NO_WINNER_SENTINEL = "__no_winner__";

export type Player = {
  id: string;
  externalId: string;
  name: string;
  avatar: string;
};

export type GameSession = {
  id: string;
  name: string;
  date: Date;
  active: boolean;
  playerIds: string[];
  playerResults: PlayerResult[];
  notes?: string | undefined;
  imageurl?: string | undefined;
  winners: GameAndWinner[];
};

export type GameAndWinner = {
  id: UUID;
  winner: string;
};

export type GameResults = {
  id: string;
  gameName: string;
  winCondition: WinCondition;
  scoringDirection: string;
  playerScores: PlayerScore[];
  gameResultNotes?: string | undefined;
  winner: string;
};

export type PlayerResult = {
  id: UUID;
  playerId: UUID;
  gameId: UUID;
  sessionId: UUID;
  result: string;
  team?: string;
  eventId: UUID;
};

export enum WinCondition {
  LeaderBoard,
  TeamBased,
  Coopratitive,
  SinglerWinner,
  SingleLoser,
}

export enum ScoringDirection {
  High,
  Low,
}

export type PlayerScore = {
  id: string;
  player: Player;
  score: number;
};

export type BoardGame = {
  id: UUID;
  clubId: UUID;
  name: string;
  winCondition: string;
  scoringDirection: string;
  hasVariant: boolean;
  roleOneLabel: string | null;
  roleTwoLabel: string | null;
  neitherLabel: string | null;
};

export type Club = {
  id: string;
  name: string;
  createdDate: Date;
  owner: string;
  avatar: string;
};

