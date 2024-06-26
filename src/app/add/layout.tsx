import TopNav from "../ui/sessions/topNav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black text-white dark:bg-black text-white">
      <div>{children}</div>
    </div>
  );
}
