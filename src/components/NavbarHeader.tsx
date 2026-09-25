'use client';

import React from 'react';
import { Moon, Sun, Globe } from 'lucide-react';
import type { Language, ThemeMode } from '@/lib/types';
import { BodiLogo } from './BodiLogo';

interface NavbarHeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  themeMode: ThemeMode;
  onToggleThemeMode: () => void;
}

export const NavbarHeader: React.FC<NavbarHeaderProps> = ({
  language,
  onLanguageChange,
  themeMode,
  onToggleThemeMode,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <header className="relative z-20 w-full max-w-6xl mx-auto pt-5 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <BodiLogo themeMode={themeMode} size="md" variant="full" />

        <div className={`hidden md:flex items-center gap-2 pl-3 border-l ${isDark ? 'border-white/15' : 'border-slate-300'}`}>
          <span
            className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md transition-colors ${
              isDark
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'bg-blue-50 text-[#0072ce] border border-blue-200 shadow-xs'
            }`}
          >
            {language === 'mn' ? 'НЭГДСЭН ПОРТАЛ' : 'ENTERPRISE SSO'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={onToggleThemeMode}
          title={
            isDark
              ? language === 'mn'
                ? 'Гэгээлэг горим руу шилжих'
                : 'Switch to Light Mode'
              : language === 'mn'
                ? 'Харанхуй горим руу шилжих'
                : 'Switch to Dark Mode'
          }
          className={`px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
            isDark
              ? 'glass-input text-slate-300 hover:text-white hover:border-white/25'
              : 'bg-white/90 hover:bg-white text-slate-800 border border-slate-200/90 shadow-sm hover:shadow-md'
          }`}
        >
          {isDark ? (
            <>
              <Moon className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline font-medium text-slate-300">
                {language === 'mn' ? 'Шөнийн горим' : 'Dark Mode'}
              </span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline font-medium text-slate-700">
                {language === 'mn' ? 'Өдрийн горим' : 'Light Mode'}
              </span>
            </>
          )}
        </button>

        <div
          className={`flex items-center p-1 rounded-xl text-xs transition-colors ${
            isDark ? 'glass-input border border-white/10' : 'bg-white/90 border border-slate-200/90 shadow-sm'
          }`}
        >
          <Globe className={`w-3.5 h-3.5 ml-1.5 mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <button
            id="lang-mn-btn"
            type="button"
            onClick={() => onLanguageChange('mn')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              language === 'mn'
                ? 'bg-[#0072ce] text-white shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            MN
          </button>
          <button
            id="lang-en-btn"
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-[#0072ce] text-white shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
};
