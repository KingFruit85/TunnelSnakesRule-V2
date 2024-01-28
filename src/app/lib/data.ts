"use server";

import { sql } from "@vercel/postgres";
import { BoardGame, GameSession, Player } from "./definitions";
import { unstable_noStore as noStore } from "next/cache";

export async function getPlayerById(id: string): Promise<Player> {
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
      gameResults: String(session.gameResults),
    }));
  
    return sessions;
  }

  export async function getAllPlayers() {
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

  export async function getAllPlayersBySessionId(id:string) {
    const result = await sql`
      SELECT PlayerIds FROM sessions WHERE id = ${id}`;

      const playerIds = result.rows[0].playerids.split(",");
      let players = [] as Player[];

      playerIds.map(async (playerid:string) => {
        const player = await getPlayerById(playerid);
        players.push(player);
      });
    
    return players;
  }

  export async function getAllBoardgames() {
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