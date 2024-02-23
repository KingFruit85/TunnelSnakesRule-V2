import AvailableClubs from "@/app/ui/clubs/AvailableClubs";

export default function Home({searchParams}: {searchParams: Record<string, string>}) {

  const userId = searchParams.user_id || "";

  return (
    <div className="w-full flex flex-col space-items items-center py-5">
      <AvailableClubs userId={userId} />
    </div>
  );
}
