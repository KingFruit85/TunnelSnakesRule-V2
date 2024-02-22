import AddGameResult from "@/app/ui/add/Results/addGameResult";

export default async function Home({searchParams}: {searchParams: Record<string, string>}) {

  const sessionId = searchParams.sessionId;
  const clubId = searchParams.clubId;
 
  return (
    <div className="flex-col border border-tunnel-snake-white bg-black ml-2 mr-2 mt-2">
      <AddGameResult sessionId={sessionId} clubId={clubId}/>
    </div>
  );
}
