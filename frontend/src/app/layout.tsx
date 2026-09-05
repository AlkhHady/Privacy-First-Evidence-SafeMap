import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruang Aman",
  description: "Platform privacy-first untuk menyusun bukti secara terstruktur.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
