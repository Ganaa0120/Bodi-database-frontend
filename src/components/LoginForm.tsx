'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth, LoginError } from '@/contexts/AuthContext';
import type { Language, ThemeMode } from '@/lib/types';

interface LoginFormProps {
  language: Language;
  themeMode: ThemeMode;
  redirectTo: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ language, themeMode, redirectTo }) => {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // ⚠️ Одоогоор зөвхөн UI төлөв — backend дээр session TTL-ийг өөрчлөх
  // логик хараахан хэрэгжээгүй тул энэ сонголт функциональ нөлөөгүй.
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isDark = themeMode === 'dark';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMsg(
        language === 'mn'
          ? 'Ажилтны и-мэйл болон нууц үгээ оруулна уу'
          : 'Please enter corporate email and password'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      await login(email, password);
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof LoginError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(
          language === 'mn' ? 'Сүлжээний алдаа гарлаа. Дахин оролдоно уу.' : 'Network error. Please try again.'
        );
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-left mb-6">
        <h1 className={`text-2xl font-bold tracking-tight transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {language === 'mn' ? 'Системд нэвтрэх' : 'Sign in to Portal'}
        </h1>
        <p className={`text-sm mt-1.5 leading-relaxed transition-colors ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {language === 'mn'
            ? 'Бодь Группийн системд бүртгэгдсэн эрхээр нэвтрэн орох боломжтой.'
            : 'Access the Bodi Group corporate intranet with your employee credentials.'}
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} noValidate className="space-y-4 text-left">
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold tracking-wider uppercase transition-colors ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {language === 'mn' ? 'И-мэйл' : 'Corporate Email'}
          </label>
          <div className="relative">
            <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              id="login-email-input"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMsg('');
              }}
              disabled={isLoading}
              placeholder="username@bodigroup.mn"
              className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60 ${
                isDark ? 'glass-input text-white placeholder:text-slate-500' : 'glass-input-light placeholder:text-slate-400'
              }`}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={`text-xs font-semibold tracking-wider uppercase transition-colors ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {language === 'mn' ? 'Нууц үг' : 'Password'}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-500 hover:text-blue-400 font-medium transition-colors hover:underline"
            >
              {language === 'mn' ? 'Нууц үгээ мартсан уу?' : 'Forgot password?'}
            </Link>
          </div>

          <div className="relative">
            <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              id="login-password-input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg('');
              }}
              disabled={isLoading}
              placeholder="••••••••••••"
              className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60 ${
                isDark ? 'glass-input text-white placeholder:text-slate-500' : 'glass-input-light placeholder:text-slate-400'
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-label={
                showPassword
                  ? language === 'mn'
                    ? 'Нууц үгийг нуух'
                    : 'Hide password'
                  : language === 'mn'
                    ? 'Нууц үгийг харуулах'
                    : 'Show password'
              }
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              id="remember-me-checkbox"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              {language === 'mn' ? 'Энэ төхөөрөмж дээр намайг санах' : 'Remember me on this device'}
            </span>
          </label>
        </div>

        <button
          id="login-submit-btn"
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#0072ce] via-blue-600 to-indigo-700 hover:from-[#0060ad] hover:to-indigo-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-[#0072ce]/30 hover:shadow-[#0072ce]/45 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>{language === 'mn' ? 'Нэвтрэх' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className={`mt-8 text-xs leading-relaxed transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {language === 'mn'
          ? 'Нэвтрэхэд асуудал гарвал системийн админтай холбогдоно уу.'
          : 'If you have trouble signing in, contact your system administrator.'}
      </p>
    </div>
  );
};
