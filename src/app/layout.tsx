import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
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
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <ClerkProvider>
        <body className="">
          <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} storageKey="tsr-theme">
            <Suspense>
              <TopNav />
            </Suspense>
            {children}
          </ThemeProvider>
        </body>
      </ClerkProvider>
    </html>
  );
}
