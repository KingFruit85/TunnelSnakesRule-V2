import TopNav from "../ui/sessions/topNav";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
      <div>
        <TopNav />
        <div>{children}</div>
      </div>
    );
  }