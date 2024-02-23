import TopNav from "../ui/sessions/topNav";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
      <div>
        <div>{children}</div>
      </div>
    );
  }