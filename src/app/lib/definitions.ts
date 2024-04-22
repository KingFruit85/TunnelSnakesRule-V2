import { UUID } from "crypto";

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
};

export type Club = {
  id: string;
  name: string;
  createdDate: Date;
  owner: string;
};

export enum Destination {
  AddNewClub,
  JoinExistingClub,
  ClubSessions,
  ReviewAceessRequests,
  AddNewBoardGame,
  Groups,
  PlayerProfile,
}

export type ClubAndRequestStatus = {
  club: Club;
  accessRequestPending: boolean;
};

export type ClubAccessRequest = {
  requestorName: string;
};
