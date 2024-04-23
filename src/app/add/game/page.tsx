import AddNewGame from "@/app/ui/add/addNewGame";

export default function Home() {
  return (
    <div className="w-full flex flex-col space-items items-center py-5 bg-black text-white dark:bg-black text-white">
      <AddNewGame />
    </div>
  );
}
