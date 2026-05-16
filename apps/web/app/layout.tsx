import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade — Terminal",
  description: "Algorithmic trading operations terminal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0, height: "100vh", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
