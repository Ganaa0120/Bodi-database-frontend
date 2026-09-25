'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Department } from '@/lib/types';
import { DashboardShell } from '../DashboardShell';

export default function AllDepartmentsPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !user) router.replace('/login');
    else if (!isInitializing && user && user.role !== 'super_admin') router.replace('/dashboard');
  }, [isInitializing, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'super_admin') return;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await authorizedFetch('/api/departments/all');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа.');
        if (!cancelled) setDepartments(data.departments);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Алдаа гарлаа.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, authorizedFetch]);

  if (isInitializing || !user || user.role !== 'super_admin') {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card rounded-3xl px-6 py-5">
          <h1 className="font-serif text-2xl text-white">{language === 'mn' ? 'Бүх хэлтэс' : 'All Departments'}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {language === 'mn' ? 'Bodi Group-ийн бүх компанийн бүх хэлтэс.' : "All departments across Bodi Group's companies."}
          </p>
        </div>

        <div className="dash-card overflow-hidden rounded-3xl">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
          ) : loadError ? (
            <p className="px-4 py-8 text-center text-sm text-rose-300">{loadError}</p>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <FolderKanban className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">{language === 'mn' ? 'Хэлтэс бүртгэгдээгүй байна.' : 'No departments yet.'}</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Компани' : 'Company'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Хэлтэс' : 'Department'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Админ' : 'Admin'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Имэйл' : 'Email'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Үүсгэсэн' : 'Created'}</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="px-4 py-3.5 font-medium text-white">{d.company_name}</td>
                    <td className="px-4 py-3.5 text-slate-300">{d.name}</td>
                    <td className="px-4 py-3.5 text-slate-400">{d.admin_full_name || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-400">{d.admin_email || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {new Date(d.created_at).toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}