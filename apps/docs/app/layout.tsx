import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cricket Platform - Documentation",
  description: "Documentation for the Cricket Platform built with Next.js and Turborepo",
  keywords: ["cricket", "platform", "documentation", "turborepo", "next.js"],
  authors: [{ name: "Cricket Platform Team" }],
  openGraph: {
    title: "Cricket Platform - Documentation",
    description: "Cricket Platform documentation site",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cricket Platform - Documentation",
    description: "Cricket Platform documentation site",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
