"use server";

import { sql } from "@vercel/postgres";
import { BoardGame, GameSession, Player, GameResults } from "./definitions";
import { unstable_noStore as noStore } from "next/cache";

export async function getPlayerById(id: string): Promise<Player> {
  noStore();
  const result = await sql`
    SELECT * FROM Players WHERE id = ${id}`;

  const playerRow = result.rows[0];

  const player = {
    id: String(playerRow.id),
    name: String(playerRow.name),
    email: String(playerRow.email),
    password: String(playerRow.password),
    avatar: String(playerRow.avatar),
  } as Player;

  return player;
}

export async function getAllActiveSessions() {
  noStore();
  const result = await sql`
    SELECT * FROM Sessions WHERE active = true`;

  const sessions: GameSession[] = result.rows.map((session) => ({
    id: String(session.id),
    name: String(session.name),
    date: new Date(session.date),
    active: Boolean(session.active),
    playerIds: session.playerids.split(","),
    gameResults: JSON.parse(session.gameresults) as GameResults[],
    notes: String(session.notes),
    imageurl: session.imageurl || undefined,
  }));

  return sessions;
}

export async function getAllInactiveSessions() {
  noStore();
  const result = await sql`
    SELECT * FROM Sessions WHERE active = false`;

  const sessions: GameSession[] = result.rows.map((session) => ({
    id: String(session.id),
    name: String(session.name),
    date: new Date(session.date),
    active: Boolean(session.active),
    playerIds: session.playerids.split(","),
    gameResults:
      session.gameresults !== null && session.gameresults !== ""
        ? (JSON.parse(session.gameresults) as GameResults[])
        : [],
    notes: String(session.notes),
    imageurl: String(session.imageurl) || undefined,
  }));

  return sessions;
}

export async function getAllPlayers() {
  noStore();
  const result = await sql`
      SELECT * FROM Players`;

  const players: Player[] = result.rows.map((player) => ({
    id: String(player.id),
    name: String(player.name),
    email: String(player.email),
    password: String(player.password),
    avatar: String(player.avatar),
  }));

  return players;
}

export async function getAllPlayersBySessionId(id: string) {
  noStore();
  console.log("Getting players for session: ", id);
  const result = await sql`
      SELECT PlayerIds FROM sessions WHERE id = ${id}`;

      const playerIds = result.rows[0].playerids.split(",") as string[];

    // Use map instead of forEach to map each ID to a promise of getPlayerById
    const playerPromises = playerIds.map(async (id) => {
      const player = await getPlayerById(id);
      return player;
    });
  
    // Wait for all promises to resolve using Promise.all
    const players = await Promise.all(playerPromises);
  
    console.log("Players: ", players);

  return players;
}

export async function getAllBoardgames() {
  noStore();
  const result = await sql`
    SELECT * FROM boardgames`;

  const boardgames: BoardGame[] = result.rows.map((boardgame) => ({
    id: String(boardgame.id),
    name: String(boardgame.name),
    winCondition: String(boardgame.wincondition),
    picture: String(boardgame.picture),
  }));

  return boardgames;
}
