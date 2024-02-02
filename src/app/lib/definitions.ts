export type Player = {
    id: string;
    name: string;
    email: string;
    password: string;
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
    winCondition: string;
    scoringDirection: string;
    playerScores: PlayerScore[];
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