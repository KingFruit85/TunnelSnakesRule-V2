
import { currentUser } from "@clerk/nextjs";
import UserClubs from "./ui/clubs/userClubs";
import { SignOutButton, SignInButton } from "@clerk/nextjs";
import { checkIfUserHasPlayerProfile } from "./lib/data";
import { createNewPlayerRecord } from "./lib/actions";

export default async function Home() {
  const user = await currentUser();

  if (user) {
    const userHasCreatedAccount = await checkIfUserHasPlayerProfile(user?.id as string);

    if (!userHasCreatedAccount) {
      await createNewPlayerRecord(user);
    }
  }

  return (
    <div className="h-screen">

      {!user && <SignInButton />}

      {user ? <SignOutButton/> : null}


      {user ? <> 
        <div className="w-full flex flex-col space-items items-center py-5">
      <UserClubs />
      </div>
      </> : null}
    
      

    </div>
  );
}
