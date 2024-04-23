import { currentUser } from "@clerk/nextjs";
import UserClubs from "./ui/clubs/userClubs";
import { SignInButton } from "@clerk/nextjs";
import { checkIfUserHasPlayerProfile } from "./lib/data";
import { createNewPlayerRecord } from "./lib/actions";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const user = await currentUser();

  if (user) {
    const userHasCreatedAccount = await checkIfUserHasPlayerProfile(
      user?.id as string
    );

    if (!userHasCreatedAccount) {
      await createNewPlayerRecord(user);
    }
  }

  return (
    <div className="w-full flex flex-col space-items items-center py-5 bg-black dark:bg-black">
      {!user && (
        <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[25%] sm:w-[95%] flex-col border p-4 rounded-sm bg-black text-white dark:bg-black text-white">
          <div className="p-4">
            <Image
              src={"/game.jpeg"}
              alt={"home icon"}
              width={0}
              height={0}
              sizes="100vw"
              style={{ width: "100%", height: "auto" }} // optional
            />
            <h1 className="p-4 text-2xl font-bold">Let&apos;s get playing!</h1>
            <h2 className="p-4">
              <Link
                target="_blank"
                className="text-tunnel-snake-green"
                href={"https://www.youtube.com/watch?v=S0ximxe4XtU"}
              >
                Tunnel Snakes Rule!
              </Link>
              <b className="text-tunnel-snake-orange"> *</b> is a site that
              enables you to create a boardgame group and log your gaming
              sessions to keep a history of winners and losers. Remember
              memorable moments by uploading photos to sessions, or tag your
              games with house rules or just reminders of those hard to remember
              rules!
            </h2>
            <h2 className="p-4">Log in to get started!</h2>
            <div className="text-tunnel-snake-green flex border border-tunnel-snake-green rounded-sm p-4 gap-2 items-center justify-center hover:bg-tunnel-snake-green hover:text-white">
              <SignInButton>Tunnel Snakes Rule!</SignInButton>
            </div>
            <i className="text-xs text-tunnel-snake-orange">(name pending*)</i>
          </div>
        </div>
      )}

      {user ? (
        <>
          <div className="w-full flex flex-col space-items items-center py-5">
            <UserClubs />
          </div>
        </>
      ) : null}
    </div>
  );
}
