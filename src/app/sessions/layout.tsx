import TopNav from "../ui/sessions/topNav";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex-col gap-6">

        <TopNav />
        <div>{children}</div>
      </div>
    );
  }