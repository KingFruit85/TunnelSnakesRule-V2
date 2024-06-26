import { addImageToPlayer } from "@/app/lib/actions";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  const clientPayload =
      "clientPayload" in body.payload ? body.payload.clientPayload : null;
  console.log(`clientPayload is ${clientPayload} at the top` );

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        pathname: string
        /* clientPayload?: string, */
      ) => {
  console.log(`clientPayload is ${clientPayload} in handleUpload` );

        // Generate a client token for the browser to upload the file
        // ⚠️ Authenticate and authorize users before generating the token.
        // Otherwise, you're allowing anonymous uploads.

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/gif"],
          tokenPayload: JSON.stringify({clientPayload
            // optional, sent to your server on upload completion
            // you could pass a user id from auth, or a value from clientPayload
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const tp = JSON.parse(tokenPayload!);
  console.log(`clientPayload is ${clientPayload} in onUploadCompleted and token payload is ${tp.clientPayload}` );

        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow

        console.log("blob upload completed", blob, tokenPayload);

        try {
          if (tp) {
            await addImageToPlayer(blob.url, tp.clientPayload);
            console.log("added image to player", blob.url, tp.clientPayload);
          } else {
            console.log("no client payload");
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
