import { GameSession } from "@/app/lib/definitions";
import Image from "next/image";


export interface CurrentSessionImagesProps {
    session: GameSession;
    handleEndSession: () => void;
  }
  
  export default function CurrentSessionImages({
    session,
    handleEndSession,
  }: CurrentSessionImagesProps) {
    return (
        <div>
            {session.imageurl && (
            <Image
              src={session.imageurl}
              width={100}
              height={100}
              alt={"add photo icon"}
            />
          )}
        </div>
    )
  }