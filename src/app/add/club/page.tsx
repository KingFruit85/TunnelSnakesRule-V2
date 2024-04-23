import AddNewClub from "@/app/ui/add/addNewClub";

export default function Home() {
  return (
    <div className="w-full flex flex-col space-items items-center py-5 bg-black text-white dark: bg-black text-white">
      <AddNewClub />
    </div>
  );
}
