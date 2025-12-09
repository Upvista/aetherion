import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "Vista AI - AI Companion Robot",
  description: "Vista AI - An interactive AI companion robot with voice conversation and animated emotions. Developed by Hamza Hafeez.",
  manifest: "/manifest.json",
  themeColor: "#00ffff",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  authors: [{ name: "Hamza Hafeez" }],
  creator: "Hamza Hafeez",
  publisher: "Hamza Hafeez",
  keywords: ["AI", "companion", "robot", "voice", "conversation", "Vista AI"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vista AI",
  },
  openGraph: {
    title: "Vista AI - AI Companion Robot",
    description: "An interactive AI companion robot with voice conversation and animated emotions",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/assets/vista logo.PNG" />
        <link rel="apple-touch-icon" href="/assets/vista logo.PNG" />
        <meta name="theme-color" content="#00ffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Vista AI" />
        <meta name="apple-mobile-web-app-orientation" content="landscape" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Vista AI" />
        <meta name="author" content="Hamza Hafeez" />
      </head>
      <body className={`${orbitron.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
