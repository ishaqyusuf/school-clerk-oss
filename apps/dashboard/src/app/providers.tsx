"use client";

import { TRPCReactProvider } from "@/trpc/client";
import { ReactNode } from "react";
import { I18nProviderClient } from "@/locales/client";
// import { SessionProvider } from "next-auth/react";
type ProviderProps = {
  locale: string;
  children: ReactNode;
};

export function Providers({ children, locale = "en" }: ProviderProps) {
  return (
    // <SessionProvider>
    <TRPCReactProvider>
      <I18nProviderClient locale={locale}>
        {/* <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          > */}
        {children}
        {/* </ThemeProvider> */}
      </I18nProviderClient>
    </TRPCReactProvider>
    // </SessionProvider>
  );
}
