import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InnovaOS — Plataforma para gastronomía",
  description:
    "Sistema multi-tenant de pedidos QR, caja, fidelización y analytics para bares, cafés y restaurantes.",
  applicationName: "InnovaOS",
  authors: [{ name: "InnovaOS" }],
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
