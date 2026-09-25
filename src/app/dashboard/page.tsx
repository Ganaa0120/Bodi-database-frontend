'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users2, ClipboardCheck, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SubmissionStat } from '@/lib/types';
import { DashboardShell } from './DashboardShell';

export default function DashboardPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [stats, setStats] = useState<SubmissionStat[] | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !user) {
      router.replace('/login');
    }
  }, [isInitializing, user, router]);

  useEffect(() => {
    if (!user || (user.role !== 'company' && user.role !== 'super_admin')) return;
    authorizedFetch('/api/form-submissions/stats')
      .then((res) => res.json())
      .then((data) => setStats(data.stats ?? []))
      .catch(() => setStats([]));
  }, [user, authorizedFetch]);

  // Department хэрэглэгчийн Хэлтэс тодорхой нэрийг (жишээ нь "HR")
  // харуулахын тулд өөрийн department-ийг татна — "Хэлтэс" гэсэн
  // ерөнхий үг л харагдахаас сэргийлнэ.
  useEffect(() => {
    if (!user || user.role !== 'department') return;
    authorizedFetch('/api/departments/mine')
      .then((res) => res.json())
      .then((data) => setDepartmentName(data.department?.name ?? null))
      .catch(() => setDepartmentName(null));
  }, [user, authorizedFetch]);

  if (isInitializing || !user) {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    language === 'mn'
      ? hour < 12 ? 'Өглөөний мэнд' : hour < 18 ? 'Өдрийн мэнд' : 'Оройн мэнд'
      : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const roleBadgeText =
    user.role === 'super_admin'
      ? 'Super Admin'
      : user.role === 'company'
        ? language === 'mn' ? 'Компани (CEO)' : 'Company (CEO)'
        : departmentName
          ? `${departmentName} ${language === 'mn' ? 'хэлтэс' : 'Department'}`
          : language === 'mn' ? 'Хэлтэс' : 'Department';

  const statCards = [
    { icon: Building2, labelMn: 'Компаниуд', labelEn: 'Companies', value: '—' },
    { icon: Users2, labelMn: 'Хэлтэсүүд', labelEn: 'Departments', value: '—' },
    { icon: ClipboardCheck, labelMn: 'Хүлээгдэж буй хүсэлт', labelEn: 'Pending approvals', value: '—' },
    { icon: TrendingUp, labelMn: 'Энэ сарын тайлан', labelEn: "This month's reports", value: '—' },
  ];

  const chartLabel =
    user.role === 'super_admin'
      ? language === 'mn' ? 'Компани тус бүрийн хүлээн зөвшөөрсөн тайлан' : 'Accepted reports by company'
      : language === 'mn' ? 'Хэлтэс тус бүрийн хүлээн зөвшөөрсөн тайлан' : 'Accepted reports by department';

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card rounded-3xl px-6 py-5">
          <p className="text-sm text-slate-400">
            {greeting}, {user.full_name.split(' ')[0]} 👋
          </p>
          <h1 className="mt-1 font-serif text-2xl text-white">
            {language === 'mn' ? 'Тавтай морил' : 'Welcome back'}
          </h1>
          <span className="mt-2 inline-block rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-blue-300">
            {roleBadgeText}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.labelEn} className="dash-card rounded-2xl p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                <stat.icon className="h-4.5 w-4.5" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-0.5 text-xs text-slate-400">{language === 'mn' ? stat.labelMn : stat.labelEn}</p>
            </div>
          ))}
        </div>

        {(user.role === 'company' || user.role === 'super_admin') && (
          <div className="dash-card rounded-3xl p-6">
            <h2 className="text-sm font-semibold text-white">{chartLabel}</h2>
            {stats === null ? (
              <p className="mt-4 text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
            ) : stats.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                {language === 'mn' ? 'Хүлээн зөвшөөрсөн тайлан алга байна.' : 'No accepted reports yet.'}
              </p>
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="group_name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: '#141b2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#0072ce" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        <div className="dash-card rounded-3xl p-6 text-center">
          <p className="text-sm text-slate-400">
            {language === 'mn'
              ? 'Дэлгэрэнгүй KPI график дараагийн шатанд нэмэгдэнэ.'
              : 'Detailed KPI charts will be added in the next phase.'}
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}