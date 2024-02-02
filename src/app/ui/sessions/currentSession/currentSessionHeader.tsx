"use client";

import { GameSession } from "@/app/lib/definitions";
import Image from "next/image";
import ImageUploadPage from "../../add/addImage";
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
    <div className="gap-4 flex mt-2 ml-2 mr-2 items-center">
      {/* <div>
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
      </div> */}
        <button type="button" onClick={handleOpen}>
          <Image
            className="flex items-center gap-2"
            src={"/Camera.svg"}
            width={20}
            height={20}
            alt={"add photo icon"}
          />
        </button>
        <button type="button" onClick={handleShowNotes}>
          <Image
            className="flex items-center gap-2"
            src={"/Paper.svg"}
            width={20}
            height={20}
            alt={"add notes icon"}
          />
        </button>
        <div className="text-base md:text-lg lg:text-lg xl:text-lg text-center font-montserrat flex items-center">
          {formattedDate}
        </div>

      <div className="text-1xl md:text-2xl lg:text-2xl xl:text-2xl text-center font-montserrat flex items-center text-tunnel-snake-green">
        {session?.name}
      </div>
      <div className="flex items-center gap-2 mr-1">
        <Image
          src={"/Dice.svg"}
          width={20}
          height={20}
          alt={"number of players in session icon"}
        />

        <div>{session?.gameResults?.length || 0}</div>
      </div>
    </div>
  );
}
