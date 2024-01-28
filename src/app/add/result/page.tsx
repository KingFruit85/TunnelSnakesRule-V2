import AddGameResult from "@/app/ui/add/addGameResult";

export default async function Home({searchParams}: {searchParams: Record<string, string>}) {

  const sessionId = searchParams.sessionId;
 
  return (
    <div className="w-full flex flex-col space-items items-center py-5">
      <AddGameResult sessionId={sessionId} />
    </div>
  );
}
