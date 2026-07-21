import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
});

const inter = Inter({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "64.PIZZA — Menu",
  description: "Scannez, commandez, régalez-vous. Pizzeria — livraison & sur place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0f0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${bebasNeue.variable} ${inter.variable} h-full`}>
      <body className="min-h-full bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
