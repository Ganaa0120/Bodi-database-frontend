import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Бодь Групп - Бизнес төлөвлөгөөний нэгдсэн портал",
  description: "Bodi Group – Business Planning Portal",
  applicationName: "Бодь Групп",
  icons: {
    icon: [
      { url: "/images/sololog.png", sizes: "any" },
      { url: "/images/sololog.png", type: "image/png", sizes: "512x512" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B2A4A",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="mn" className={inter.variable}>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>{children}</AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}