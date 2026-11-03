import type { Metadata } from "next";
import type React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "OpenSourceMate – Find open-source issues that fit your skills";
const siteDescription =
  "Discover open-source issues matched to your skills, explore contribution opportunities, and find your next project with OpenSourceMate.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  applicationName: "OpenSourceMate",
  icons: {
    icon: "/image.png",
    shortcut: "/image.png",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: "OpenSourceMate",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
