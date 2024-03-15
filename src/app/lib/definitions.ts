export type Player = {
    id: string;
    externalId: string;
    name: string;
    avatar: string;
}

export type GameSession = {
    id: string;
    name: string;
    date: Date;
    active: boolean;
    playerIds: string[];
    gameResults: GameResults[];
    notes?: string | undefined;
    imageurl?: string | undefined;
}

export type GameResults = {
    id: string;
    gameName: string;
    winCondition: WinCondition;
    scoringDirection: string;
    playerScores: PlayerScore[];
    gameResultNotes?: string | undefined;
    winner: string;
}

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
}

export type BoardGame = {
    id: string;
    name: string;
    winCondition: string;
    picture: string;
}

export type Club = {
    id: string;
    name: string;
    createdDate: Date;
    owner: string;
}

export enum Destination {
    AddNewClub,
    JoinExistingClub,
    ClubSessions,
    ReviewAceessRequests,
}

export type ClubAndRequestStatus = {
    club: Club;
    accessRequestPending: boolean;
  };

export type ClubAccessRequest = {
    requestorName: string;
}