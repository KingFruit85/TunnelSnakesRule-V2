"use server";
import {
  getBoardgameById,
  getEventNotes,
  getEventWinner,
  getPlayerById,
} from "@/app/lib/data";
import { GameSession, PlayerResult } from "@/app/lib/definitions";
import { UUID } from "crypto";

export interface PreviousSessionGameResultProps {
  session: GameSession;
}

export default function PreviousSessionGameResult({
  session,
}: PreviousSessionGameResultProps) {
  return <div></div>;
}
