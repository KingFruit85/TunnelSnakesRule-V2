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
    <div className="flex gap-1 px-2 py-2 items-center flex-col">
      <div className="flex items-center ">
        {/* {session.imageurl && session.imageurl.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {session?.imageurl?.map((image, index) => (
              <Image
                key={index}
                src={image}
                width={100}
                height={100}
                alt={"session image"}
              />
            ))}
          </div>
          
        )} */}
      </div>
    </div>
  );
}
