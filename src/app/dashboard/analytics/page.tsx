"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalyticsResponse } from "@/lib/types";
import { DashboardShell } from "../DashboardShell";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#10b981",
  rejected: "#f43f5e",
};

const STATUS_LABEL_MN: Record<string, string> = {
  pending: "Хүлээгдэж буй",
  accepted: "Зөвшөөрсөн",
  rejected: "Татгалзсан",
};
const STATUS_LABEL_EN: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

export default function AnalyticsPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [companyId, setCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isInitializing && !user) router.replace("/login");
    else if (
      !isInitializing &&
      user &&
      user.role !== "super_admin" &&
      user.role !== "company"
    )
      router.replace("/dashboard");
  }, [isInitializing, user, router]);

  useEffect(() => {
    if (!user || (user.role !== "super_admin" && user.role !== "company"))
      return;
    setIsLoading(true);
    const qs = new URLSearchParams();
    if (companyId) qs.set("companyId", companyId);
    if (departmentId) qs.set("departmentId", departmentId);
    if (status) qs.set("status", status);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);

    authorizedFetch(`/api/analytics?${qs.toString()}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [user, authorizedFetch, companyId, departmentId, status, from, to]);

  if (
    isInitializing ||
    !user ||
    (user.role !== "super_admin" && user.role !== "company")
  ) {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">
          {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
        </p>
      </div>
    );
  }

  const statusLabel = (s: string) =>
    (language === "mn" ? STATUS_LABEL_MN[s] : STATUS_LABEL_EN[s]) || s;

  const totalCount =
    data?.totalsByStatus.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const countOf = (s: string) =>
    data?.totalsByStatus.find((x) => x.status === s)?.count ?? 0;

  const pieData =
    data?.totalsByStatus.map((s) => ({
      name: statusLabel(s.status),
      value: s.count,
      color: STATUS_COLORS[s.status],
    })) ?? [];

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card rounded-3xl px-6 py-5">
          <h1 className="font-serif text-2xl text-white">
            {language === "mn" ? "Аналитик" : "Analytics"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {language === "mn"
              ? "Бүх илгээсэн тайлангийн статистик, шүүлтүүртэй."
              : "Statistics across all submitted reports, filterable."}
          </p>
        </div>

        {/* Шүүлтүүрүүд */}
        <div className="dash-card flex flex-wrap gap-3 rounded-3xl p-4">
          {user.role === "super_admin" && (
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setDepartmentId("");
              }}
              className="glass-input rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="" className="bg-[#0e1626]">
                {language === "mn" ? "Бүх компани" : "All companies"}
              </option>
              {data?.filters.companies.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0e1626]">
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm text-white"
          >
            <option value="" className="bg-[#0e1626]">
              {language === "mn" ? "Бүх хэлтэс" : "All departments"}
            </option>
            {data?.filters.departments.map((d) => (
              <option key={d.id} value={d.id} className="bg-[#0e1626]">
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm text-white"
          >
            <option value="" className="bg-[#0e1626]">
              {language === "mn" ? "Бүх төлөв" : "All statuses"}
            </option>
            <option value="pending" className="bg-[#0e1626]">
              {statusLabel("pending")}
            </option>
            <option value="accepted" className="bg-[#0e1626]">
              {statusLabel("accepted")}
            </option>
            <option value="rejected" className="bg-[#0e1626]">
              {statusLabel("rejected")}
            </option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm text-white"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm text-white"
          />
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              icon: BarChart3,
              label: language === "mn" ? "Нийт" : "Total",
              value: totalCount,
              color: "text-blue-300 bg-blue-500/15",
            },
            {
              icon: Clock,
              label: statusLabel("pending"),
              value: countOf("pending"),
              color: "text-amber-300 bg-amber-500/15",
            },
            {
              icon: CheckCircle2,
              label: statusLabel("accepted"),
              value: countOf("accepted"),
              color: "text-emerald-300 bg-emerald-500/15",
            },
            {
              icon: XCircle,
              label: statusLabel("rejected"),
              value: countOf("rejected"),
              color: "text-rose-300 bg-rose-500/15",
            },
          ].map((k) => (
            <div key={k.label} className="dash-card rounded-2xl p-4">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${k.color}`}
              >
                <k.icon className="h-4.5 w-4.5" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{k.value}</p>
              <p className="mt-0.5 text-xs text-slate-400">{k.label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="dash-card rounded-3xl px-4 py-10 text-center text-sm text-slate-400">
            {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {/* Status donut */}
              <div className="dash-card rounded-3xl p-6 lg:col-span-2">
                <h2 className="text-sm font-semibold text-white">
                  {language === "mn" ? "Төлвийн харьцаа" : "Status breakdown"}
                </h2>
                {totalCount === 0 ? (
                  <p className="mt-8 text-center text-sm text-slate-500">
                    {language === "mn" ? "Дата алга." : "No data."}
                  </p>
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#141b2d",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* By company/department */}
              <div className="dash-card rounded-3xl p-6 lg:col-span-3">
                <h2 className="text-sm font-semibold text-white">
                  {data?.groupLabel === "company"
                    ? language === "mn"
                      ? "Компаниар"
                      : "By company"
                    : language === "mn"
                      ? "Хэлтэсээр"
                      : "By department"}
                </h2>
                {!data || data.byGroup.length === 0 ? (
                  <p className="mt-8 text-center text-sm text-slate-500">
                    {language === "mn" ? "Дата алга." : "No data."}
                  </p>
                ) : (
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byGroup}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.08)"
                        />
                        <XAxis
                          dataKey="group_name"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          angle={-15}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "#94a3b8", fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#141b2d",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                          }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#0072ce"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Over time trend */}
            <div className="dash-card rounded-3xl p-6">
              <h2 className="text-sm font-semibold text-white">
                {language === "mn" ? "Сар тутмын хандлага" : "Monthly trend"}
              </h2>
              {!data || data.overTime.length === 0 ? (
                <p className="mt-8 text-center text-sm text-slate-500">
                  {language === "mn" ? "Дата алга." : "No data."}
                </p>
              ) : (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.overTime}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.08)"
                      />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#141b2d",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12,
                        }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        dot={{ fill: "#38bdf8", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
