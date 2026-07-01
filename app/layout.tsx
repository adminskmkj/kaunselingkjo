import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S.T.A.R KJo - Student Tracker Attitude Report",
  description: "Sistem pemantauan tingkah laku dan intervensi awal murid SMK Kampung Jawa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
