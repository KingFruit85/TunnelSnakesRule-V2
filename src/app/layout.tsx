import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import TopNav from "./ui/sessions/topNav";

const montserrat = Montserrat({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tunnel Snakes Rule",
  description: "We rule!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={montserrat.className}>
      <ClerkProvider>
        <body className="">
          <TopNav />
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
