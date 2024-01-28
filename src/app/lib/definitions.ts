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
    playerIds: string[];
    gameResults: string;
    active: boolean;
}

export type Results = {
    gameName: BoardGame;
    id: string;
    playerId: string;
    sessionId: string;
    score: number;
}

export type BoardGame = {
    id: string;
    name: string;
    winCondition: string;
    picture: string;
}