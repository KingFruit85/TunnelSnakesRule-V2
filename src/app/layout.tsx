import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import TopNav from "./ui/sessions/topNav";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <ClerkProvider>
        <body className="bg-tunnel-snake-grey ${inter.className} h-screen">
        <TopNav />
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
