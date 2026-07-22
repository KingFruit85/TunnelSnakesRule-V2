import { addImageToPlayer } from "@/app/lib/actions";
import { getPlayerByExternalId } from "@/app/lib/data";
import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/gif"],
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const tp = JSON.parse(tokenPayload!);
          if (tp && tp.userId) {
            const player = await getPlayerByExternalId(tp.userId);
            await addImageToPlayer(blob.url, player.id);
          } else {
            throw new Error(
              "No user identity in token payload"
            );
          }
        } catch (error) {
          throw new Error("Could not update user");
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
