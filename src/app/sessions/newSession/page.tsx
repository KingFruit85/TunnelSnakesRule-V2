import { getAllPlayers } from "@/app/lib/data";
import AddNewSession from "@/app/ui/sessions/addNewSession";

export default async function Page() {

    const playerNames = await getAllPlayers();

    return (
        <div className="w-full flex flex-col space-items items-center py-5">
        <AddNewSession players={playerNames}  />
        </div>
    );
  }
  