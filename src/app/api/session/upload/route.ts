import { addImageToSession } from "@/app/lib/actions";
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
      onBeforeGenerateToken: async () =>
        // pathname: string
        // clientPayload?: string,
        {
          return {
            allowedContentTypes: ["image/jpeg", "image/png", "image/gif"],
            tokenPayload: JSON.stringify({ clientPayload }),
          };
        },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const tp = JSON.parse(tokenPayload!);

        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow
        console.log("UPLOAD COMPLETED")

        try {
          console.log("in try block")
          if (tp) {
          console.log("in if block")

            const parts = tp.clientPayload.split(",");
            const sessionId = parts[0].trim();
            const clubId = parts[1].trim();

            console.log("blob.uri ", blob.url);
            console.log("sessionId ", sessionId);
            console.log("clubId ", clubId);

            await addImageToSession(
              blob.url,
              sessionId as string,
              clubId as string
            ); // WHY IS THIS NOT BEING CALLED?? PASS IN CLUBID TO REDIRECT CORRECT:LY
          } else {
            console.log("No id provided, image is not associated with a session, result or player");
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
      { status: 400 } // The webhook will retry 5 times waiting for a 200
    );
  }
}
