import AddNewSession from "@/app/ui/sessions/addNewSession";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { clubId } = await searchParams;

  return (
    <div className="w-full flex flex-col space-items items-center py-5 bg-black">
      <AddNewSession clubId={clubId} />
    </div>
  );
}
