import type { Metadata } from "next";
import { Geist, Geist_Mono, Henny_Penny } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hennyPenny = Henny_Penny({
  variable: "--font-henny-penny",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Potache",
  description: "Potache - Application de quiz par flashcards",
  icons: {
    icon: [
      { url: "/Logo/potache-32.png", sizes: "32x32", type: "image/png" },
      { url: "/Logo/potache-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/Logo/potache-192.png", sizes: "192x192" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${hennyPenny.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
