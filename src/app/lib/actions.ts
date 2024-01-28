"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FormSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const AddNewPlayer = FormSchema.omit({ id: true });

export async function addNewPlayer(formData: FormData) {
  const e = `${formData.get("playerName")}@test.com`;
  const p = "123";
  const a = "123";

  const { name } = AddNewPlayer.parse({
    name: formData.get("playerName"),
    email: e,
    password: p,
    avatar: a,
  });

  // check if user already exists
  const existingUser = await sql`
    SELECT * FROM players WHERE name = ${name}
  `;

  if (existingUser.rows.length > 0) {
    throw new Error("User already exists");
  }

  try {
    await sql`
        Insert into players (name, email, password, avatar )
        VALUES (${name} , ${e}, ${p}, ${a})
        `;
    revalidatePath("/sessions/");
  } catch (err) {
    return { message: err };
  }

  redirect("/sessions/");
}

export async function addNewGameSession(formData: FormData) {
  const players = formData.getAll("player");
  const sessionName = formData.get("sessionName")?.toString();
  const gameResults = "";
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

export async function endSession(id: string) {
  await sql`
  UPDATE Sessions SET active = false WHERE id = ${id}`;

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

  const winCondition = formData.get("winConditions")?.toString();
  const scoringDirection = formData.get("scoringDirection")?.toString();
  let playerScores = [];


  for (const pair of formData.entries()) {

    const isPlayer = pair[0].toString().split("_")[0] === "player";
    const playedGame = pair[1].toString().split(",")[0] === "true";

    if ( isPlayer && playedGame ) {

    const playerScore = {
      playerId: pair[0].toString().split("_")[1],
      score: pair[1].toString().split(",")[1]
    };
    playerScores.push(playerScore);
    }
  }
  
  const result = {
    winCondition: winCondition,
    scoringDirection: scoringDirection,
    playerScores: playerScores
  }
  // console.log(formData);
}
