import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PopoutHidden } from "@/components/popout-hidden";
import { AuthProvider } from "@/components/auth-provider";
import { NProgressProvider } from "@/components/nprogress-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
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
    <html lang="en" className={`${inter.variable} h-full antialiased dark`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var theme = localStorage.getItem('fplah-theme') || 'dark';
                var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (dark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider defaultTheme="dark">
          <AuthProvider>
            <NProgressProvider>
              <TooltipProvider>
                <Suspense>
                  <PopoutHidden>
                    <Nav />
                  </PopoutHidden>
                </Suspense>
                <main className="flex-1">{children}</main>
                <Suspense>
                  <PopoutHidden>
                    <Footer />
                  </PopoutHidden>
                </Suspense>
              </TooltipProvider>
            </NProgressProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster position="top-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
