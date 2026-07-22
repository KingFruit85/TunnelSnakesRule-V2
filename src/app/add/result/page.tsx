import AddGameResult from "@/app/ui/add/Results/addGameResult";

export default async function Home({searchParams}: {searchParams: Promise<Record<string, string>>}) {

  const { sessionId, clubId } = await searchParams;
 
  return (
      <AddGameResult sessionId={sessionId} clubId={clubId}/>
  );
}
