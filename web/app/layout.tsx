import type { Metadata } from "next";
import { QueryProvider } from "@/components/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamHub 4K",
  description: "Self-hosted streaming and download gateway"
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-zinc-950 text-zinc-100 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
