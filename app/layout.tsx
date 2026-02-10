import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BackgroundMosaic from "../components/BackgroundMosaic";
import { ToastProvider } from "../components/ToastContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wishes – Travel bucket list",
  description: "Track and explore your travel bucket list. Mark countries as done, in review or pending.",
  applicationName: "Wishes",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('wishes-theme');if(t=== 'light'||t==='dark')document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        <BackgroundMosaic />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
