"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const ROLE_LABELS: Record<string, { mn: string; en: string }> = {
  super_admin: { mn: "Super Admin", en: "Super Admin" },
  company: { mn: "Компани (CEO)", en: "Company (CEO)" },
  department: { mn: "Хэлтэс", en: "Department" },
};

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function DashboardNavbar({
  onOpenMobileSidebar,
}: {
  onOpenMobileSidebar: () => void;
}) {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role];
  const now = new Date();

  return (
    <header className="dash-rail flex shrink-0 items-center justify-between gap-3 rounded-3xl px-4 py-3.5 shadow-lg">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        className="md:hidden flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/10"
        aria-label="Цэс нээх"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden sm:block text-sm text-slate-400">
        {now.toLocaleDateString(language === "mn" ? "mn-MN" : "en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLanguage(language === "mn" ? "en" : "mn")}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Хэл солих"
        >
          {language === "mn" ? "MN" : "EN"}
        </button>

        <div className="mx-1 h-6 w-px bg-white/10" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/10"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0072ce] to-indigo-600 text-xs font-bold text-white">
              {getInitials(user.full_name)}
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-200">
              {user.full_name}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="dash-card absolute right-0 mt-2 w-56 rounded-xl py-2 shadow-xl">
              <div className="border-b border-white/10 px-3.5 py-2">
                <p className="text-sm font-semibold text-white">
                  {user.full_name}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{user.email}</p>
                <span className="mt-1.5 inline-block rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">
                  {roleLabel
                    ? language === "mn"
                      ? roleLabel.mn
                      : roleLabel.en
                    : user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
                {language === "mn" ? "Гарах" : "Log out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
