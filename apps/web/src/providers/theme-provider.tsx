"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App theme provider. Light is the default; users opt into dark via ThemeToggle.
 * Class strategy so Tailwind's `dark:` variant + our `.dark` token block apply.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
