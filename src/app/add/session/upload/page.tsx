"use client";

import { redirectBackToSessions } from "@/app/lib/actions";
import CancelButton from "@/app/ui/Common/cancelButton";
import { upload } from "@vercel/blob/client";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";

export default function Page() {
  const session = useSearchParams();

  const sessionId = session.get("sessionId");
  const clubId = session.get("clubId");

  const payload = `${sessionId}, ${clubId}`

  const inputFileRef = useRef<HTMLInputElement>(null);
  // const [blob, setBlob] = useState<PutBlobResult | null>(null);

  return (
    <div className="flex flex-col border border-tunnel-snake-white bg-black items-center p-4 mt-4 mr-4 ml-4">
      <h1
        className="text-3xl md:text-2xl lg:text-2xl xl:text-2xl 
      text-center font-montserrat flex items-center text-tunnel-snake-green mb-4 flex-col"
      >
        Upload Your Image
      </h1>

      <form
        className="items-center flex flex-col"
        onSubmit={async (event) => {
          event.preventDefault();

          if (!inputFileRef.current?.files) {
            throw new Error("No file selected");
          }

          const file = inputFileRef.current.files[0];

          const newBlob = await upload(file.name, file, {
            access: "public",
            contentType: file.type,
            handleUploadUrl: "/api/session/upload",
            clientPayload: payload || "",
          });

          // setBlob(newBlob);
          redirectBackToSessions(clubId as string)

        }}
      >
        <input
          className="mb-4 items-center flex p-2 gap-2"
          name="file"
          ref={inputFileRef}
          type="file"
          required
        />

        <button
          type="submit"
          className="text-tunnel-snake-green flex border 
                     border-tunnel-snake-green rounded-sm 
                     p-2 gap-2 items-center justify-center w-[50%] mb-4
                     hover:bg-tunnel-snake-green hover:text-tunnel-snake-black"
        >
          Upload
        </button>
        <CancelButton/>
      </form>
    </div>
  );
}
