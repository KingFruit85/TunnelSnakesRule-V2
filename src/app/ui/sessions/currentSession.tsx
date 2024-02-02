"use client";

import { endSession } from "@/app/lib/actions";
import { GameSession, GameResults } from "@/app/lib/definitions";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Box, Button, Grid, Modal, Paper, styled } from "@mui/material";
import ImageUploadPage from "../add/addImage";
import CurrentSessionHeader from "../currentSession/currentSessionHeader";
import CurrentSessionGames from "./currentSessionGames";
import CurrentSessionButtons from "./currentSessionButton";
import CurrentSessionImages from "./currentSessionImages";

export interface currentSessionProps {
  session: GameSession;
}

export default function CurrentSession({ session }: currentSessionProps) {
  console.log("session: ", session);

  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showImageUpload, setShowImageUpload] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");


  useEffect(() => {
    const notes = localStorage.getItem("sessionNotes");
    if (notes) {
      setNotes(notes);
    }
  }, []);

  const formattedDate = session?.date?.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handleEndSession = () => {
    localStorage.setItem("sessionNotes", notes);
    endSession(session.id, notes);
  };

  const handleShowNotes = () => {
    setShowNotes(!showNotes);
  };

  const handleShowImageUpload = () => {
    setShowImageUpload(!showImageUpload);
  };

  const recordNotes = (note: string) => {
    setNotes(note);

    // Clear the specific item related to notes
    localStorage.removeItem("sessionNotes");

    // Append the new note
    localStorage.setItem("sessionNotes", note);
  };

  const style = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "tunnel-snake-black",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
  };

  const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: theme.palette.mode === "dark" ? "#000000" : "#000000",
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: "center",
    color: theme.palette.text.secondary,
  }));

  return (
    <Box sx={{ flexGrow: 1 }} className="bg-black w-[50em]  ">
      <Grid container  spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 8, md: 12 }}>
        <Grid item xs={12}>
          <Item>
            <CurrentSessionHeader
              handleShowNotes={handleShowNotes}
              formattedDate={formattedDate}
              session={session}
            />
          </Item>
        </Grid>
        <Grid item xs={12}>
          <Item>
            <CurrentSessionGames session={session} />
          </Item>
        </Grid>
        <Grid item xs={6}>
          <Item>
            <CurrentSessionButtons
              session={session}
              handleEndSession={handleEndSession}
            />
          </Item>
        </Grid>
        <Grid item xs={6}>
          <Item>
            <CurrentSessionImages
              session={session}
              handleEndSession={handleEndSession}
            />
          </Item>
        </Grid>
      </Grid>
    </Box>
  );
}
