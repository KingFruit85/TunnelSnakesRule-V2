import AddGameResult from "@/app/ui/add/Results/addGameResult";

export default async function Home({searchParams}: {searchParams: Record<string, string>}) {

  const sessionId = searchParams.sessionId;
  const clubId = searchParams.clubId;
 
  return (
      <AddGameResult sessionId={sessionId} clubId={clubId}/>
  );
}
