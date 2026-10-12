"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Light/dark mode: next-themes puts the .dark class on <html>, which is where
// globals.css switches the Pluto Store tokens, so portals follow it too.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
