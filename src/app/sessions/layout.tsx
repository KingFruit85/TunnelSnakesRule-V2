import TopNav from "../ui/sessions/topNav";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex-col ">

        <TopNav />
        <div>{children}</div>
      </div>
    );
  }