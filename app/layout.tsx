import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orkestra Şefi",
  description: "Fabrika Karar Destek Sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="bg-[#080c14] text-[#f0f4ff] antialiased">
        {children}
      </body>
    </html>
  );
}
