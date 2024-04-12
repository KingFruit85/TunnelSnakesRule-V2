"use server";

import { number, z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { UUID } from "crypto";
import { User } from "@clerk/nextjs/server";
import { WinCondition } from "./definitions";
import { getClubDetails } from "./data";

const FormSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const AddNewPlayer = FormSchema.omit({ id: true });

export const redirectBackToSessions = (clubId: string) => {
  revalidatePath(`/sessions/?clubId=${clubId}`);
  redirect(`/sessions/?clubId=${clubId}`);
};

export async function addImageToSession(
  blobUri: string,
  sessionId: string,
  clubId: string
) {
  // get current images for the session
  const currentSession = await sql`
    SELECT imageurl FROM sessions WHERE id = ${sessionId}`;

  console.log(`imageurl: ${currentSession}`);

  // parse the current images to get an array
  const currentImagesArray =
    currentSession.rows[0].imageurl !== null
      ? JSON.parse(currentSession?.rows[0].imageurl)
      : [];

  console.log(`currentImagesArray: ${currentImagesArray}`);

  // add the new image to the array
  currentImagesArray.push(blobUri);

  // convert the updated array back to JSON string
  const updatedImagesJson = JSON.stringify(currentImagesArray);

  console.log(`updatedImagesJson: ${updatedImagesJson}`);

  // update the imageurl column in the database

  await sql`
  UPDATE sessions 
    SET imageurl = ${updatedImagesJson}
    WHERE id = ${sessionId}`;

  revalidatePath(`/sessions/?clubId=${clubId}`);
  redirect(`/sessions/?clubId=${clubId}`);
}

export async function addImageToPlayer(blobUri: string, playerId: string) {
  console.log(`adding image ${blobUri} to player ${playerId}`);
  await sql`
  UPDATE players 
    SET avatar = ${blobUri}
    WHERE id = ${playerId}`;
}

export async function addNewPlayer(formData: FormData) {
  const email = `${formData.get("playerName")}@test.com`;
  const password = "123";
  const avatar = "123";

  const { name } = AddNewPlayer.parse({
    name: formData.get("playerName"),
    email: email,
    password: password,
    avatar: avatar,
  });

  // check if user already exists
  const existingUser = await sql`
    SELECT * FROM players WHERE name = ${name}
  `;

  if (existingUser.rows.length > 0) {
    throw new Error("User with that name already exists");
  }

  try {
    await sql`
        Insert into players (name, email, password, avatar )
        VALUES (${name} , ${email}, ${password}, ${avatar})
        `;
  } catch (err) {
    return { message: err };
  }

  const newPlayerId = await sql`
        Select id from players where name = ${name}
        `;

  return newPlayerId.rows[0].id as string;
}

export async function addNewGameSession(formData: FormData) {
  const players = formData.getAll("player");
  const sessionName = formData.get("sessionName")?.toString();
  const clubId = formData.get("clubId")?.toString();
  const gameResults = "[]";
  const active = true;
  const date = new Date().toISOString();

  const playerIds = players.join(",");

  // check if session name already exists for that club
  const existingSession = await sql`
    SELECT * FROM sessions WHERE session_name = ${sessionName} AND club_id = ${clubId}
  `;

  if (existingSession.rows.length > 0) {
    throw new Error("Session with that name already exists");
  }

  await sql`
        Insert into sessions (id, session_name, date, active, player_ids, game_results, club_id)
        VALUES (${uuidv4()}, ${sessionName} , ${date}, ${active}, ${playerIds}, ${gameResults}, ${clubId})
        `;

  revalidatePath(`/sessions/?clubId=${clubId}`);
  redirect(`/sessions/?clubId=${clubId}`);
}

export async function endSession(id: string, notes: string) {
  await sql`
  UPDATE Sessions 
    SET active = false,
        notes = ${notes} 
    WHERE id = ${id}`;

  revalidatePath("/sessions/");
}

export async function addNewBoardGame(formData: FormData) {
  const name = formData.get("gameName")?.toString();
  const winCondition = formData.get("winCondition")?.toString();
  const clubId = formData.get("clubId")?.toString();
  const scoringDirection = formData.get("scoringDirection")?.toString();

  const club = clubId ? getClubDetails(clubId) : null;

  if (!club) {
    throw new Error("Club does not exist");
  }

  await sql`
        Insert into boardgames (id, title, win_condition, club_id, scoring_direction)
        VALUES (${uuidv4()}, ${name} , ${winCondition}, ${clubId}, ${scoringDirection})
        `;
  redirect("/sessions/");
}

export async function addNewClub(formData: FormData) {
  const name = formData.get("clubName")?.toString();
  const owner = formData.get("owner")?.toString();

  // Execute the SQL query with the RETURNING clause
  const result = await sql`
  INSERT INTO clubs (club_name, owner)
  VALUES (${name}, ${owner})
  RETURNING *;`;

  // Extract the values of the inserted row from the result
  const insertedClub = result.rows[0];

  // Now you can access the values of the inserted club
  const insertedClubId = insertedClub.id as UUID;

  if (owner && insertedClubId) {
    await addPlayerToClub(owner, insertedClubId);
  }

  revalidatePath("/join/club/");
  redirect("/");
}

export async function addPlayerToClub(playerId: string, clubId: UUID) {
  await sql`
        INSERT INTO players_clubs (player_id, club_id)
        VALUES (${playerId}, ${clubId})`;

  await removePlayerFromRequestList(playerId, clubId);

  revalidatePath(`/requests?userid=${playerId}&clubid=${clubId}`);
}

export async function removePlayerFromRequestList(
  playerId: string,
  clubId: UUID
) {
  await sql`
        DELETE FROM joinrequests
        WHERE player_id = ${playerId} AND club_id = ${clubId}`;
}

export async function requestAccessToClub(playerId: string, clubId: UUID) {
  await sql`
        INSERT INTO joinrequests (player_id, club_id)
        VALUES (${playerId}, ${clubId})`;
}

export async function createNewPlayerRecord(user: User) {
  await sql`
        Insert into players (externalid, name, avatar)
        VALUES (${user.id}, ${user.firstName}, ${user.imageUrl})
        `;
}

export async function addNewGameResult(formData: FormData) {
  const sessionId = formData.get("sessionId")?.toString();
  const winCondition = formData.get("winCondition")?.toString();
  const scoringDirection = formData.get("scoringDirection")?.toString();
  const gameId = formData.get("gameId")?.toString();
  const notes = formData.get("gameResultNotes")?.toString();
  const clubId = formData.get("clubId")?.toString();
  let winner = formData.get("winner")?.toString();

  let playerScores = [];

  for (const pair of formData.entries()) {
    const isPlayer = pair[0].toString().split("_")[0] === "player";
    const playedGame = pair[1].toString().split(",")[0] === "true";

    if (isPlayer && playedGame) {
      const playerScore = {
        playerId: pair[0].toString().split("_")[1],
        score: pair[1].toString().split(",")[1],
        team: pair[1].toString().split(",")[2],
      };
      playerScores.push(playerScore);
    }
  }

  if (!winner) {
    if (scoringDirection === "High") {
      // get the id of the highest score in playerScores
      const highestScore = Math.max(
        ...playerScores.map((playerScore) => Number(playerScore.score))
      );

      const highestScoringPlayer = playerScores.find(
        (playerScore) => Number(playerScore.score) === highestScore
      );

      winner = highestScoringPlayer?.playerId;
    } else {
      // get the id of the lowest score in playerScores
      const lowestScore = Math.min(
        ...playerScores.map((playerScore) => Number(playerScore.score))
      );

      const lowestScoringPlayer = playerScores.find(
        (playerScore) => Number(playerScore.score) === lowestScore
      );

      winner = lowestScoringPlayer?.playerId;
    }
  }

  const eventId = uuidv4();


  // iterate through playerScores and add each to the database
  for (const playerScore of playerScores) {
    await sql`
        INSERT INTO playerscores (id, player_id, game_id, session_id, result, team, event_id)
        VALUES (${uuidv4()}, ${playerScore.playerId}, ${gameId}, ${sessionId}, ${playerScore.score}, ${playerScore.team}, ${eventId})`;
  }

  const newResult = {
    id: uuidv4(),
    gameName: gameId,
    winCondition: winCondition,
    scoringDirection: scoringDirection,
    playerScores: playerScores,
    gameResultNotes: notes,
    winner: winner,
  };



  await sql`
        INSERT INTO gameResults ( game_id, session_id, player_scores, winner, notes)
        VALUES (${gameId}, ${sessionId}, ${JSON.stringify(playerScores)}, ${winner}, ${notes})`;

  // // Retrieve existing gameResults
  // const existingResults = await sql`
  //  SELECT gameResults FROM sessions WHERE id = ${sessionId}`;

  // // Parse existing gameResults to get an array
  // const existingResultsArray =
  //   existingResults.rows[0].gameresults !== null
  //     ? JSON.parse(existingResults?.rows[0].gameresults)
  //     : [];

  // // Add the new result to the array
  // existingResultsArray.push(newResult);

  // // Convert the updated array back to JSON string
  // const updatedResultsJson = JSON.stringify(existingResultsArray);

  // // Update the gameResults column in the database
  // await sql`
  //    UPDATE sessions SET gameResults = ${updatedResultsJson} WHERE id = ${sessionId}`;

  revalidatePath(`/sessions?clubId=${clubId}`);
  redirect(`/sessions?clubId=${clubId}`);
}
