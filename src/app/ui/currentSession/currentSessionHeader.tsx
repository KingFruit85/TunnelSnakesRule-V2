"use client";

import { GameSession } from "@/app/lib/definitions";
import { Box, Button, Modal } from "@mui/material";
import Image from "next/image";
import style from "styled-jsx/style";
import ImageUploadPage from "../add/addImage";
import { useState } from "react";

export interface CurrentSessionHeaderProps {
  handleShowNotes: () => void;
  formattedDate: string;
  session?: GameSession;
}

export default function CurrentSessionHeader({
  handleShowNotes,
  formattedDate,
  session,
}: CurrentSessionHeaderProps) {
  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);
  const handleOpen = () => setOpen(true);

  return (
    <div className="justify-start items-center gap-4 inline-flex ">
      <div>
            <Modal
              open={open}
              onClose={handleClose}
              aria-labelledby="modal-modal-title"
              aria-describedby="modal-modal-description"
            >
              <Box sx={style}>
                <ImageUploadPage id={session!.id} />
              </Box>
            </Modal>
          </div>
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
      <div className="justify-start items-center gap-2 flex">
              <div className="text-white text-xl font-medium font-['Montserrat'] flex">
                <Image
                  className="pb-1"
                  src={"/Dice.svg"}
                  width={25}
                  height={25}
                  alt={"number of players in session icon"}
                />

                <div className="pl-4">{session?.gameResults?.length || 0}</div>
              </div>
            </div>
    </div>
  );
}
