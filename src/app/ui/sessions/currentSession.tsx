"use client";

import { endSession } from "@/app/lib/actions";
import { GameSession, GameResults } from "@/app/lib/definitions";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Box, Button, Modal, Typography } from "@mui/material";
import ImageUploadPage from "../add/addImage";

export interface currentSessionProps {
  session: GameSession;
}

export default function CurrentSession({session}: currentSessionProps) {

  console.log("session: ",session);

  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showImageUpload, setShowImageUpload] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

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
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'tunnel-snake-black',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };

  return (
    <div className="w-[60em] self-stretch flex-col justify-start items-start gap-6 inline-flex">
      <div className="self-stretch px-6 py-5 bg-tunnel-snake-black border border-tunnel-snake-orange flex-col justify-start items-start gap-[27px] flex">
        <div className="self-stretch justify-between items-start inline-flex">
        <div>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
        <ImageUploadPage id={session.id} />

        </Box>
      </Modal>
    </div>
          <div className="justify-start items-center gap-4 inline-flex ">
            <Button type="button" onClick={handleOpen}>
            <Image
              src={"/Camera.svg"}
              width={25}
              height={25}
              alt={"add photo icon"}
            />
            </Button>
            <button type="button" onClick={handleShowNotes}>
              <Image
                src={"/Paper.svg"}
                width={25}
                height={25}
                alt={"add notes icon"}
              />
            </button>
            <div className="text-white text-2xl font-semibold font-['Montserrat'] flex">
              {formattedDate}
            </div>
            <div className="text-tunnel-snake-green text-2xl font-normal font-['Montserrat']">
              {session?.name}
            </div>
          </div>
          <div className="justify-start items-start gap-8 flex">
            <div className="justify-start items-center gap-2 flex">
              <div className="text-white text-xl font-medium font-['Montserrat'] flex">
                <Image
                  className="pb-1"
                  src={"/Dice.svg"}
                  width={25}
                  height={25}
                  alt={"number of players in session icon"}
                />

                <div className="pl-4">{session.gameResults?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>
        {showNotes && (
          <textarea
            name="sessionNotes"
            value={notes}
            onChange={(e) => recordNotes(e.target.value)}
            className="mb-4 bg-tunnel-snake-grey border rounded-sm border-tunnel-snake-green text-tunnel-snake-orange w-[20pc] h-[5pc]"
          />
        )}
        <div className="self-stretch flex-col justify-start items-center gap-3 flex">
          {session?.gameResults?.map((gameResult: GameResults) => (
            console.log(gameResult.id),
            gameResult.id && (<div
              key={gameResult.id}
              className="self-stretch justify-start items-center gap-2 inline-flex"
            >
              <div className="justify-start items-center gap-2 flex">
                <div className="text-white text-xl font-medium font-['Montserrat'] inline-flex">
                  <Image
                    className="pb-1"
                    src={"/Players.svg"}
                    width={25}
                    height={25}
                    alt={"number of players in game icon"}
                  />
                  <div className="pl-4">{gameResult.playerScores.length}</div>
                </div>
              </div>
              <div className="text-white text-xl font-normal font-['Montserrat']">
                -
              </div>
              <div className="text-white text-xl font-normal font-['Montserrat']">
                {gameResult.gameName}
              </div>
            </div>)
          ))}
        </div>
        <div className="justify-start items-start gap-6 inline-flex">
          <Link
            className="px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-green justify-start items-center gap-3 flex"
            href={{
              pathname: "/add/result/",
              query: {
                sessionId: session.id,
                playerIds: session.playerIds.toString(),
              },
            }}
          >
            <Image
              src={"/Trophy.svg"}
              width={20}
              height={20}
              alt={"number of players in session icon"}
            />
            <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
              Add result
            </div>
          </Link>

          <button
            onClick={handleEndSession}
            className="px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-red justify-start items-center gap-3 flex"
          >
            <div className="text-tunnel-snake-red text-base font-medium font-['Montserrat'] inline-flex">
              End session
            </div>
          </button>
          {session.imageurl && (
            <Image
            src={session.imageurl}
            width={25}
            height={25}
            alt={"add photo icon"}
          />
          )}
        </div>
      </div>
    </div>
  );
}
