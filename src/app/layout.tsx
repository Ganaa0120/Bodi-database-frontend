import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Lora, Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import './globals.css';

const lora = Lora({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-lora',
  style: ['normal', 'italic'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Бодь Групп - Бизнес төлөвлөгөөний нэгдсэн портал',
  description: 'Bodi Group – Business Planning Portal',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn" className={`${lora.variable} ${inter.variable}`}>
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