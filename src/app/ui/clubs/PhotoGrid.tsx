"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { ImagePlus } from "lucide-react";

export interface PhotoGridProps {
  sessionId: string;
  clubId: string;
  images: string[];
}

export default function PhotoGrid({ sessionId, clubId, images }: PhotoGridProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await upload(file.name, file, {
        access: "public",
        contentType: file.type,
        handleUploadUrl: "/api/session/upload",
        clientPayload: `${sessionId},${clubId}`,
      });
      router.refresh();
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 px-5 pb-4">
      {images.map((src, i) => (
        <div key={src} className="relative h-[110px] overflow-hidden border border-divider grayscale">
          <Image src={src} alt={`Session photo ${i + 1}`} fill className="object-cover" />
        </div>
      ))}
      <label className="flex h-[110px] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-divider text-text opacity-60">
        {uploading ? (
          <span className="text-[12px]">Uploading...</span>
        ) : (
          <>
            <ImagePlus size={20} strokeWidth={2} />
            <span className="text-[12px]">Add photo</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {error && <p className="col-span-2 text-[12px] text-accent-700">{error}</p>}
    </div>
  );
}
