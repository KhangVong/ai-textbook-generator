import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";
import 'katex/dist/katex.min.css';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Antigravity Textbook Engine",
  description: "AI-Powered Textbooks with Interactive Learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html
        lang="en"
        className={`${inter.variable} h-full antialiased suppressHydrationWarning`}
      >
        <head>
          <link 
            rel="stylesheet" 
            href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" 
            integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqO1bDfUqQzZ/OzhGz8i6D/uy1z1X0K8" 
            crossOrigin="anonymous" 
          />
        </head>
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
