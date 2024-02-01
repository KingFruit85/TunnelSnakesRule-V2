"use client";

import { type PutBlobResult } from "@vercel/blob";
import { upload } from "@vercel/blob/client";
import { useState, useRef, useEffect } from "react";

export interface ImageUploadPageProps {
  id: string;
}

export default function ImageUploadPage({ id }: ImageUploadPageProps) {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);

  console.log(id);

  return (
    <div className="p-12 bg-tunnel-snake-black border border-white flex-col items-center gap-8 inline-flex">
      <div className="text-white text-[32px] font-semibold font-['Montserrat']">
        <h1>Upload Your Image</h1>
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();

          if (!inputFileRef.current?.files) {
            throw new Error("No file selected");
          }

          const file = inputFileRef.current.files[0];

          const newBlob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/avatar/upload",
            clientPayload: id,
          });

          setBlob(newBlob);
        }}
      >
        <input
          className="mb-8"
          name="file"
          ref={inputFileRef}
          type="file"
          required
        />

        <div className="flex-col justify-start items-start gap-5 flex">
          <button
            type="submit"
            className="w-[400px] px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green justify-center items-center gap-3 inline-flex "
          >
            <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
              Upload
            </div>
          </button>
        </div>
      </form>
      {blob && (
        <div>
          Blob url: <a href={blob.url}>{blob.url}</a>
        </div>
      )}
    </div>
  );
}
