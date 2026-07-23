import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { Dices } from "lucide-react";
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
      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="flex h-24 w-24 items-center justify-center border-2 border-divider">
          <Dices size={40} strokeWidth={2} className="text-accent" />
        </div>
        <h1 className="mt-6 text-[34px] font-bold leading-[1.05] text-text">Tunnel Snakes Rule!</h1>
        <p className="mt-3 text-[14px] text-text opacity-65">
          Log your club&apos;s sessions and keep a history of winners and losers.
        </p>
      </div>
      <div className="border-t-2 border-divider px-6 pb-12 pt-5">
        <SignInButton mode="modal">
          <button className={buttonClasses({ block: true })}>Log in</button>
        </SignInButton>
      </div>
    </AppShell>
  );
}
