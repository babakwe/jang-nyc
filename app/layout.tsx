import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Umami analytics — privacy-first, no cookies, GDPR compliant
// Website ID is public (goes into HTML); env var allows override if needed.
const UMAMI_SCRIPT = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ?? "https://cloud.umami.is/script.js";
const UMAMI_ID     = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? "c2abcd84-3463-44d8-9c5b-ebdc9503d865";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jàng NYC — Free Certification Prep",
  description: "Free practice tests for NYC licenses and certifications: FDNY Fire Guard, CNA, HHA, Driver License, Security Guard, Court Interpreter, and more.",
  keywords: "NYC certification, FDNY fire guard, CNA exam, HHA test, NY driver license, security guard license, court interpreter exam",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Umami analytics — privacy-first, no cookies, GDPR compliant */}
        {UMAMI_ID && (
          <Script
            src={UMAMI_SCRIPT}
            data-website-id={UMAMI_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
