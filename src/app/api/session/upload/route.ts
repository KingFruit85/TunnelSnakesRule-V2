import { addImageToSession } from "@/app/lib/actions";
import { checkIfPlayerIsClubMember } from "@/app/lib/data";
import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  const clientPayload =
    "clientPayload" in body.payload ? body.payload.clientPayload : null;

  try {
    const jsonResponse = await handleUpload({
      body: body,
      request: request,
      onBeforeGenerateToken: async () => {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/gif"],
          tokenPayload: JSON.stringify({ clientPayload, userId }),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const tp = JSON.parse(tokenPayload!);
          if (tp && tp.clientPayload) {
            const parts = tp.clientPayload.split(",");
            const sessionId = parts[0].trim();
            const clubId = parts[1].trim();

            const isMember = await checkIfPlayerIsClubMember(tp.userId, clubId);
            if (!isMember) {
              throw new Error("Forbidden");
            }

            await addImageToSession(
              blob.url,
              sessionId as string,
              clubId as string
            );
          } else {
            throw new Error(
              "No id provided, image is not associated with a session, result or player"
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
