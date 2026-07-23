import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import TopNav from "./ui/sessions/topNav";
import { Suspense } from "react";

const archivo = Archivo({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-archivo",
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
    <html lang="en" className={archivo.variable}>
      <ClerkProvider>
        <body className="">
          <Suspense>
            <TopNav />
          </Suspense>
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
