'use client';

import { useState } from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import { BackgroundAmbient } from '@/components/BackgroundAmbient';
import { NavbarHeader } from '@/components/NavbarHeader';
import { LoginForm } from '@/components/LoginForm';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function LoginPageClient({ redirectTo }: { redirectTo: string }) {
  const { themeMode, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [cardTilt, setCardTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    isHovered: false,
  });

  const isDark = themeMode === 'dark';

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    const rotateX = ((rect.height / 2 - y) / (rect.height / 2)) * 1.8;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 1.8;

    setCardTilt({ rotateX, rotateY, glareX: percentX, glareY: percentY, isHovered: true });
  };

  const handleCardMouseLeave = () => {
    setCardTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, isHovered: false });
  };

  return (
    <div
      className={`relative min-h-screen flex flex-col justify-between overflow-x-hidden transition-colors duration-500 ${
        isDark ? 'text-slate-100' : 'text-slate-900'
      }`}
    >
      <BackgroundAmbient themeMode={themeMode} backgroundImageSrc="/images/corporate-bg.jpg" />

      <NavbarHeader
        language={language}
        onLanguageChange={setLanguage}
        themeMode={themeMode}
        onToggleThemeMode={toggleTheme}
      />

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-2 sm:my-4">
        <div className="w-full max-w-lg">
          <div
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{
              transform: `perspective(1200px) rotateX(${cardTilt.rotateX}deg) rotateY(${cardTilt.rotateY}deg)`,
              transition: cardTilt.isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s ease-out',
            }}
            className={`relative rounded-3xl p-6 sm:p-9 border-beam-container shadow-2xl transition-all duration-300 ${
              isDark ? 'glass-panel' : 'glass-panel-light'
            }`}
          >
            <div
              className="absolute -top-px left-1/2 -translate-x-1/2 w-3/4 h-[1.5px] blur-[0.5px]"
              style={{
                background: isDark
                  ? 'linear-gradient(90deg, transparent, #38bdf8, #60a5fa, transparent)'
                  : 'linear-gradient(90deg, transparent, #2563eb, #38bdf8, transparent)',
              }}
            />

            <div
              className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-200 overflow-hidden"
              style={{
                opacity: cardTilt.isHovered ? (isDark ? 0.38 : 0.55) : 0,
                background: isDark
                  ? `radial-gradient(circle 380px at ${cardTilt.glareX}% ${cardTilt.glareY}%, rgba(255, 255, 255, 0.2), transparent 60%)`
                  : `radial-gradient(circle 380px at ${cardTilt.glareX}% ${cardTilt.glareY}%, rgba(255, 255, 255, 0.75), transparent 60%)`,
              }}
            />

            <div className={`absolute inset-0 rounded-3xl pointer-events-none ${isDark ? 'glass-sheen' : 'glass-sheen-light'}`} />

            <LoginForm language={language} themeMode={themeMode} redirectTo={redirectTo} />
          </div>

          <div
            className={`mt-4 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs backdrop-blur-md transition-colors ${
              isDark ? 'bg-white/[0.04] border border-white/10 text-slate-300' : 'bg-white/90 border border-slate-200/90 text-slate-700 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0072ce]" />
              <span className="font-medium">
                {language === 'mn' ? 'Мэдээллийн аюулгүй байдал: Хамгаалагдсан' : 'Enterprise Security: TLS 1.3'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <a
                href="/forgot-password"
                className="text-[#0072ce] hover:text-blue-700 font-semibold underline underline-offset-2"
              >
                {language === 'mn' ? 'Нууц үг сэргээх' : 'Password Recovery'}
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer
        className={`relative z-10 w-full text-center py-4 text-xs font-medium transition-colors border-t ${
          isDark ? 'text-slate-400 border-white/10' : 'text-slate-600 border-slate-200/80 bg-white/30 backdrop-blur-xs'
        }`}
      >
        <p>© 2026 {language === 'mn' ? 'Боди Групп ХХК. Бүх эрх хуулиар хамгаалагдсан.' : 'Bodi Group LLC. All rights reserved.'}</p>
      </footer>
    </div>
  );
}