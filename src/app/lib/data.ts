"use server";

import { QueryResult, QueryResultRow, sql } from "@vercel/postgres";
import {
  BoardGame,
  GameSession,
  Player,
  GameResults,
  Club,
  WinCondition,
  PlayerResult,
  GameAndWinner,
} from "./definitions";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { UUID } from "crypto";
import Results from "../ui/winConditions/results";

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
    externalId: String(id),
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

export async function getAllClubSessionNames(clubId: string) {
  noStore();
  const result = await sql`
    SELECT name FROM sessions WHERE clubId = ${clubId}`;

  const sessionNamesPromises = result.rows.map((row) => row.name);

  const sessionNames = (await Promise.all(sessionNamesPromises)) as string[];

  return sessionNames;
}

export async function getAllActiveSessionDetails(clubId: string) {
  noStore();

  if (!clubId) {
    redirect("/");
  }

  const result = await sql`
    SELECT * FROM sessions WHERE active = true AND club_id = ${clubId}`;

  // get all the playerresults linked to the session

  let playerResults: PlayerResult[] = [];

  for (const row of result.rows) {
    const result = await sql`
          SELECT * FROM playerscores WHERE session_id = ${row.id}`;

    for (const score of result.rows) {
      let r: PlayerResult = {
        id: score["id"],
        playerId: score["player_id"],
        gameId: score["game_id"],
        sessionId: score["session_id"],
        result: score["result"],
        team: score["team"] || null,
        eventId: score["event_id"],
      };
      playerResults.push(r);
    }
  }

  const eventIds = [...new Set(playerResults.map((r) => r.eventId))];

  const winnerPromises = eventIds.map(async (id) => {
    const winner = await getEventWinner(id);
    return winner;
  });

  const winners = await Promise.all(winnerPromises);

  // add the playerresults to the gameResults prop on the corosponding session object

  const sessions: GameSession[] = result.rows.map((session) => ({
    id: String(session.id),
    name: String(session["session_name"]),
    date: new Date(session.date),
    active: Boolean(session.active),
    playerIds: session["player_ids"].split(","),
    playerResults: playerResults.filter((r) => r.sessionId === session.id),
    notes: String(session.notes),
    imageurl: session["image_urls"] || "",
    winners: winners,
  }));

  return sessions;
}

export async function getAllInactiveSessions(clubId: string) {
  noStore();
  const result = await sql`
    SELECT * FROM sessions WHERE active = false AND club_id = ${clubId}`;

  const sessions: GameSession[] = result.rows.map((session) => ({
    id: String(session.id),
    name: String(session["session_name"]),
    date: new Date(session.date),
    active: Boolean(session.active),
    playerIds: session["player_ids"].split(","),
    gameResults: [],
    playerResults: [],
    notes: String(session.notes),
    imageurl: (session.imageurl as string) || undefined,
    winners: [],
  }));

  return sessions;
}

export async function getSessionDetails(id: string) {
  noStore();
  const result = await sql`
    SELECT * FROM Sessions WHERE id = ${id}`;

  const session = result.rows[0];

  let playerResults: PlayerResult[] = [];

  for (const row of result.rows) {
    const result = await sql`
          SELECT * FROM playerscores WHERE session_id = ${row.id}`;

    for (const score of result.rows) {
      let r: PlayerResult = {
        id: score["id"],
        playerId: score["player_id"],
        gameId: score["game_id"],
        sessionId: score["session_id"],
        result: score["result"],
        team: score["team"] || null,
        eventId: score["event_id"],
      };
      playerResults.push(r);
    }
  }

  const eventIds = [...new Set(playerResults.map((r) => r.eventId))];

  const winnerPromises = eventIds.map(async (id) => {
    const winner = await getEventWinner(id);
    return winner;
  });

  const winners = await Promise.all(winnerPromises);

  // add the playerresults to the gameResults prop on the corosponding session object

  const sessions: GameSession[] = result.rows.map((session) => ({
    id: String(session.id),
    name: String(session["session_name"]),
    date: new Date(session.date),
    active: Boolean(session.active),
    playerIds: session["player_ids"].split(","),
    playerResults: playerResults.filter((r) => r.sessionId === session.id),
    notes: String(session.notes),
    imageurl: session["image_urls"] || "",
    winners: winners,
  }));

  return sessions;
}

export async function checkAccessRequestStatus(
  playerId: string,
  clubId: string
) {
  noStore();
  const result = await sql`
    SELECT * FROM joinrequests WHERE player_id = ${playerId} AND club_id = ${clubId}`;

  return result.rows.length > 0;
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

export async function checkIfPlayerIsClubOwner(clubId: string, userId: string) {
  noStore();
  const result = await sql`
    SELECT * FROM clubs WHERE id = ${clubId} and owner = ${userId}`;

  return result.rows.length > 0;
}

export async function checkForOutstandingClubAccessRequests(clubid: string) {
  noStore();
  const result = await sql`
    SELECT * FROM joinrequests WHERE club_id = ${clubid}`;

  return result.rows.length > 0;
}

export async function getAllAcessRequests(clubId: string) {
  noStore();
  const result = await sql`
    SELECT Player_id FROM joinrequests WHERE club_id = ${clubId}`;

  const requestPromises = result.rows.map(async (playerId) => {
    const player = await getPlayerByExternalId(playerId.player_id);
    return player;
  });

  const requests = await Promise.all(requestPromises);

  return requests;
}

export async function getAllPlayersBySessionId(id: string) {
  noStore();
  const result = await sql`
      SELECT player_ids FROM sessions WHERE id = ${id}`;

  const playerIds = result.rows[0]["player_ids"].split(",") as string[];

  // Use map instead of forEach to map each ID to a promise of getPlayerById
  const playerPromises = playerIds.map(async (id) => {
    const player = await getPlayerById(id);
    return player;
  });

  // Wait for all promises to resolve using Promise.all
  const players = await Promise.all(playerPromises);

  return players;
}

export async function getAllBoardgames(clubId: string) {
  noStore();
  const result = await sql`
    SELECT * FROM boardgames WHERE club_id = ${clubId}`;

  const boardgames: BoardGame[] = result.rows.map((boardgame) => ({
    id: boardgame.id,
    clubId: boardgame["club_id"],
    name: boardgame.title,
    winCondition: boardgame["win_condition"] as string,
    scoringDirection: boardgame["scoring_direction"] as string,
  }));

  return boardgames;
}

export async function getBoardgameById(id: UUID) {
  const result = await sql`
  SELECT * FROM boardgames WHERE id = ${id}`;

  const game: BoardGame = {
    id: result.rows[0]["id"],
    clubId: result.rows[0]["club_id"],
    name: result.rows[0]["title"],
    winCondition: result.rows[0]["win_condition"],
    scoringDirection: result.rows[0]["scoring_direction"],
  };

  return game;
}

export async function getClubDetails(id: string) {
  noStore();

  if (!id) {
    redirect("/");
  }

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

  const clubIds = result.rows.map((club: any) => club.club_id);

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

  const clubPromises = result.rows.map(async (club: any) => {
    const clubDetails = await getClubDetails(club.id);
    return clubDetails;
  });

  const clubs = (await Promise.all(clubPromises)) as Club[];

  return clubs;
}

export async function getEventNotes(eventId: UUID) {
  noStore();

  const result = await sql`
  SELECT notes FROM gameresults WHERE  event_id = ${eventId}`;

  return result.rows[0].notes;
}

export async function getEventWinner(eventId: UUID) {
  noStore();

  const result = await sql`
    SELECT gameresults.winner, playerscores.event_id
    FROM gameresults 
    INNER JOIN playerscores
    ON gameresults.event_id = playerscores.event_id 
    WHERE playerscores.event_id = ${eventId}`;

  const winner = result.rows[0].winner;

  const uuidPattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  if (uuidPattern.test(winner)) {
    const player = await getPlayerById(winner);
    return { winner: player.name, id: eventId } as GameAndWinner;
  } else {
    // If winner does not match UUID pattern, it'll be something like 'Team 1' or 'Tied'
    return { winner: winner, id: eventId } as GameAndWinner;
  }
}

export type GroupedBoardgameTotalPlays = {
  [gameName: string]: number;
};

export async function getPlayerEvents(playerId: UUID) {
  noStore();

  const result = await sql`
    SELECT * from playerScores WHERE player_id = ${playerId}
  `;


  const playerEvents: GroupedBoardgameTotalPlays = {};

  for (const row of result.rows) {

    const gameName = (await getBoardgameById(row.game_id)).name;

    if (playerEvents[gameName]) {
      playerEvents[gameName]++;
    } else {
      playerEvents[gameName] = 1;   
    }
  }
  return playerEvents;
}
