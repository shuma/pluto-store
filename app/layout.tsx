import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: { default: "Pluto — Your creator store", template: "%s · Pluto" },
  description:
    "Meet the new home for your creator business. Sell personalized posters with checkout, printing, and delivery handled by Pluto.",
};
// The interface font, self-hosted by next/font. The theme's font roles in
// globals.css read it through --font-inter.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // next-themes sets the mode class on <html> before hydration.
    <html lang="en" className={`${inter.variable} font-sans`} suppressHydrationWarning>
      {/* Extensions may add body attributes before hydration (e.g. stay-logged-in).
          Keep suppression scoped to this element; descendants remain checked. */}
      <body className="antialiased" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:p-4"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
