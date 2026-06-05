import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import { AuthProvider } from "@/components/auth-provider";
import { NProgressProvider } from "@/components/nprogress-provider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "nprogress/nprogress.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FPL Auction Hub",
  description: "Fantasy Premier League auction tracker and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#061423] text-[#d6e4f9] font-sans">
        <AuthProvider>
          <NProgressProvider>
            <Nav />
            <main className="flex-1">{children}</main>
          </NProgressProvider>
        </AuthProvider>
        <Toaster position="top-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
