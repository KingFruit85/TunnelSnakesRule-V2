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

  const images = session.imageurl ? JSON.parse(session.imageurl) as string[] : [] as string[];

  return (
      <div className="grid grid-cols-3">
          {images.map((image: string) => (
            <div>
              <Image
                src={image}
                alt="image"
                width={100}
                height={100}
                className="rounded-md"
              />
            </div>
          ))}

      </div>
  );
}


