"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

const FormSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const AddNewPlayer = FormSchema.omit({ id: true });

export const redirectBackToSessions = () => {
  revalidatePath("/sessions/");
  redirect("/sessions/");
};

export async function addImageToSession(blobUri: string, sessionId: string) {
  console.log(`adding image ${blobUri} to session ${sessionId}`);
  await sql`
  UPDATE sessions 
    SET imageurl = ${blobUri}
    WHERE id = ${sessionId}`;


  revalidatePath("/sessions/");
  redirect("/sessions/");
}

export async function addImageToPlayer(blobUri: string, playerId: string) {

  

  console.log(`adding image ${blobUri} to player ${playerId}`);
  await sql`
  UPDATE players 
    SET avatar = ${blobUri}
    WHERE id = ${playerId}`;

  
}

export async function addNewPlayer(formData: FormData) {

  console.log(formData);

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

  revalidatePath("/sessions/");
  redirect("/sessions/");
}

export async function addNewGameSession(formData: FormData) {
  const players = formData.getAll("player");
  const sessionName = formData.get("sessionName")?.toString();
  const gameResults = null;
  const active = true;
  const date = new Date().toISOString();

  const playerIds = players.join(",");

  await sql`
        Insert into Sessions (name, date, active, playerIds, gameResults)
        VALUES (${sessionName} , ${date}, ${active}, ${playerIds}, ${gameResults})
        `;

  revalidatePath("/sessions/");
  redirect("/sessions/");
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
  const picture = formData.get("gameArt")?.toString();

  await sql`
        Insert into Boardgames (name, winCondition, picture)
        VALUES (${name} , ${winCondition}, ${picture})
        `;
  redirect("/sessions/");
}

export async function addNewGameResult(formData: FormData) {
  console.log(formData);

  const sessionId = formData.get("sessionId")?.toString();
  const winCondition = formData.get("winCondition")?.toString();
  const scoringDirection = formData.get("scoringDirection")?.toString();
  const gameName = formData.get("gameName")?.toString();
  const notes = formData.get("gameResultNotes")?.toString();

  let playerScores = [];

  for (const pair of formData.entries()) {
    const isPlayer = pair[0].toString().split("_")[0] === "player";
    const playedGame = pair[1].toString().split(",")[0] === "true";

    if (isPlayer && playedGame) {
      const playerScore = {
        playerId: pair[0].toString().split("_")[1],
        score: pair[1].toString().split(",")[1],
      };
      playerScores.push(playerScore);
    }
  }

  const newResult = {
    id: uuidv4(),
    gameName: gameName,
    winCondition: winCondition,
    scoringDirection: scoringDirection,
    playerScores: playerScores,
    gameResultNotes: notes,
  };

  // Retrieve existing gameResults
  const existingResults = await sql`
   SELECT gameResults FROM sessions WHERE id = ${sessionId}`;

  // Parse existing gameResults to get an array
  const existingResultsArray =
    existingResults.rows[0].gameresults !== null
      ? JSON.parse(existingResults?.rows[0].gameresults)
      : [];

  // Add the new result to the array
  existingResultsArray.push(newResult);

  // Convert the updated array back to JSON string
  const updatedResultsJson = JSON.stringify(existingResultsArray);

  console.log(updatedResultsJson);

  // Update the gameResults column in the database
  await sql`
     UPDATE sessions SET gameResults = ${updatedResultsJson} WHERE id = ${sessionId}`;

  revalidatePath("/sessions/");
  redirect("/sessions/");
}
