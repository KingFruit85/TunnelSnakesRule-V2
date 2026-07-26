import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import { checkIfUserHasPlayerProfile, createNewPlayerRecord } from "./lib/db/players";
import AppShell from "./ui/ds/AppShell";
import { buttonClasses } from "./ui/ds/buttonStyles";

export default async function LoginPage() {
  const user = await currentUser();

  if (user) {
    const hasProfile = await checkIfUserHasPlayerProfile(user.id);
    if (!hasProfile) {
      await createNewPlayerRecord(user);
    }
    redirect("/clubs");
  }

  return (
    <AppShell>
      <div className="flex flex-1 flex-col justify-center">
        <div className="relative h-40 w-full overflow-hidden border-b-2 border-divider">
          <Image src="/TS.jpg" alt="Tunnel Snakes Rule" fill className="object-cover" priority />
        </div>
        <div className="flex flex-col px-6 pt-6">
          <h1 className="text-[34px] font-bold leading-[1.05] text-text">Tunnel Snakes Rule!</h1>
          <p className="mt-3 text-[14px] text-text opacity-65">
            Log your club&apos;s sessions and keep a history of winners and losers.
          </p>
          <div className="mt-7 border-t-2 border-divider pt-5">
            <SignInButton mode="modal">
              <button className={buttonClasses({ block: true })}>Log in</button>
            </SignInButton>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
