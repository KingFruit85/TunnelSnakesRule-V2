import AvailableClubs from "@/app/ui/clubs/AvailableClubs";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { user_id } = await searchParams;
  const userId = user_id || "";

  return (
    <div className="w-full flex flex-col space-items items-center py-5 bg-black text-white dark:bg-black text-white">
      <AvailableClubs userId={userId} />
    </div>
  );
}
