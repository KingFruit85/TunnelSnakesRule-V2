import TopNav from "../ui/sessions/topNav";
import { Analytics } from '@vercel/analytics/react';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex-col ">

        <TopNav />
        <div>{children}</div>
        <Analytics />
      </div>
    );
  }