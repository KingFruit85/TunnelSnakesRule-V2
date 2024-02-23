"use server";

import { sql } from "@vercel/postgres";
import {
  BoardGame,
  GameSession,
  Player,
  GameResults,
  Club,
} from "./definitions";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

export async function getPlayerById(id: string): Promise<Player> {
  noStore();
  const result = await sql`
    SELECT * FROM Players WHERE id = ${id}`;

  const playerRow = result.rows[0];

  const player = {
    id: String(playerRow.id),
    name: String(playerRow.name),
    avatar: String(playerRow.avatar),
  } as Player;

  return player;
}

export async function getPlayerByExternalId(id: string): Promise<Player> {
  noStore();
  const result = await sql`
    SELECT * FROM Players WHERE Externalid = ${id}`;

  const playerRow = result.rows[0];

  const player = {
    id: String(playerRow.id),
    name: String(playerRow.name),
    avatar: String(playerRow.avatar),
  } as Player;

  return player;
}

export async function checkIfUserHasPlayerProfile(externalId: string) {
  noStore();
  const result = await sql`
    SELECT * FROM Players WHERE externalId = ${externalId}`;

  return result.rowCount > 0;
}

export async function getAllActiveSessions(clubId: string) {
  noStore();

  if (!clubId) {
    redirect("/");
  }

  const result = await sql`
    SELECT * FROM Sessions WHERE active = true AND clubId = ${clubId}`;

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

export async function getAllInactiveSessions(clubId: string) {
  noStore();
  const result = await sql`
    SELECT * FROM Sessions WHERE active = false AND clubId = ${clubId}`;

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

export async function getAllPlayersInClub(clubId: string) {
  noStore();

  const result = await sql`
  SELECT player_id FROM players_clubs WHERE club_id = ${clubId};
  `;

  const playerIds = result.rows.map((row) => row.player_id as string);

  const playerPromises = playerIds.map(async (id) => {
    const player = await getPlayerByExternalId(id);
    return player;
  });

  const players = await Promise.all(playerPromises);

  return players;
}

export async function getAllPlayersBySessionId(id: string) {
  noStore();
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

export async function getClubDetails(id: string) {
  noStore();
  const result = await sql`
    SELECT * FROM clubs WHERE id = ${id}`;

  const club = result.rows[0];

  return {
    id: String(club.id),
    name: String(club.club_name),
    createdDate: new Date(club.created_date),
    owner: String(club.owner),
  } as Club;
}

export async function getClubsPlayerIsNotAMemberOf(userId: string) {
  noStore();
  const clubIdResult = await sql`
    SELECT id FROM clubs`;

  const allClubIds: string[] = clubIdResult.rows.map((row) => row.id as string);

  const playersClubsResult = await sql`
    SELECT club_id FROM players_clubs WHERE player_id = ${userId}`;

  const clubsPlayerIsAMemberOf: string[] = playersClubsResult.rows.map(
    (row) => row.club_id as string
  );

  const clubsPlayerIsNotAMemberOf = allClubIds.filter(
    (clubId) => !clubsPlayerIsAMemberOf.includes(clubId)
  );

  const clubPromises = clubsPlayerIsNotAMemberOf.map(async (id) => {
    const club = await getClubDetails(id);
    return club;
  });

  const clubs = await Promise.all(clubPromises);

  return clubs;
}

export async function getUsersClubs(userId: string) {
  noStore();
  const result = await sql`
  SELECT * FROM players_clubs WHERE player_id = ${userId}`;
  
  const clubIds = result.rows.map((club:any) => club.club_id);

  const clubPromises = clubIds.map(async (clubId) => {
    const club = await getClubDetails(clubId);
    return club;
  });

  const clubs = await Promise.all(clubPromises);

  return clubs;
}

export async function getAvalibleClubs() {
  noStore();
  const result = await sql`
  SELECT * FROM clubs`;

  const clubPromises = result.rows.map( async (club:any) => {
    const clubDetails = await getClubDetails(club.id);
    return clubDetails;
  });

  const clubs = await Promise.all(clubPromises) as Club[];

  return clubs;

}