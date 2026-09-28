"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  LayoutDashboard,
  Building2,
  LayoutTemplate,
  Users2,
  ClipboardCheck,
  FileText,
  KeyRound,
  FolderKanban,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  X,
} from "lucide-react";
import { BodiLogo } from "@/components/BodiLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { UserRole } from "@/lib/types";

interface NavItem {
  key: string;
  href: string;
  labelMn: string;
  labelEn: string;
  icon: ComponentType<{ className?: string }>;
  roles?: UserRole[];
  showBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    href: "/dashboard",
    labelMn: "Хяналтын самбар",
    labelEn: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "companies",
    href: "/dashboard/companies",
    labelMn: "Компаниуд",
    labelEn: "Companies",
    icon: Building2,
    roles: ["super_admin"],
  },
  {
    key: "department-templates",
    href: "/dashboard/department-templates",
    labelMn: "Хэлтэсийн загвар",
    labelEn: "Department Templates",
    icon: LayoutTemplate,
    roles: ["super_admin"],
  },
  {
    key: "all-departments",
    href: "/dashboard/all-departments",
    labelMn: "Бүх хэлтэс",
    labelEn: "All Departments",
    icon: FolderKanban,
    roles: ["super_admin"],
  },
  {
    key: "all-reports",
    href: "/dashboard/all-reports",
    labelMn: "Бүх тайлан",
    labelEn: "All Reports",
    icon: FileText,
    roles: ["super_admin"],
  },
  {
    key: "edit-requests",
    href: "/dashboard/edit-requests",
    labelMn: "Зөвшөөрлийн хүсэлтүүд",
    labelEn: "Permission Requests",
    icon: KeyRound,
    roles: ["super_admin"],
  },
  {
    key: "departments",
    href: "/dashboard/departments",
    labelMn: "Хэлтэсүүд",
    labelEn: "Departments",
    icon: Users2,
    roles: ["company"],
  },
  {
    key: "approvals",
    href: "/dashboard/approvals",
    labelMn: "Хүсэлтүүд",
    labelEn: "Approvals",
    icon: ClipboardCheck,
    roles: ["company"],
    showBadge: true,
  },
  {
    key: "my-submissions",
    href: "/dashboard/my-submissions",
    labelMn: "Миний тайлан",
    labelEn: "My Reports",
    icon: FileText,
    roles: ["department"],
    showBadge: true,
  },
  {
    key: "analytics",
    href: "/dashboard/analytics",
    labelMn: "Аналитик",
    labelEn: "Analytics",
    icon: BarChart3,
    roles: ["super_admin", "company"],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function SidebarPanel({
  collapsed,
  onToggleCollapsed,
  onCloseMobile,
  isMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile?: () => void;
  isMobile: boolean;
}) {
  const { user, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const pathname = usePathname();

  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (!user || (user.role !== "company" && user.role !== "department"))
      return;

    let cancelled = false;
    async function load() {
      try {
        const res = await authorizedFetch(
          "/api/form-submissions/pending-count",
        );
        const data = await res.json();
        if (!cancelled && res.ok) setBadgeCount(data.count ?? 0);
      } catch {
        // сүлжээний алдаа — badge 0 хэвээр үлдэнэ, критик биш
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, authorizedFetch]);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <div
      className={`dash-rail flex h-full flex-col ${isMobile ? "rounded-r-3xl" : "rounded-3xl shadow-lg"}`}
    >
      <div
        className={`flex items-center gap-2 px-3.5 py-4 ${collapsed ? "justify-center" : ""}`}
      >
        {!collapsed && (
          <BodiLogo
            themeMode="dark"
            size="sm"
            variant="emblem"
            className="shrink-0"
          />
        )}
        {!collapsed && (
          <span className="flex-1 truncate text-sm font-bold tracking-tight text-slate-100">
            {language === "mn" ? "" : ""}
          </span>
        )}

        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex items-center justify-center rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={
              collapsed
                ? language === "mn"
                  ? "Sidebar дэлгэх"
                  : "Expand sidebar"
                : language === "mn"
                  ? "Sidebar хураах"
                  : "Collapse sidebar"
            }
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        )}

        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex items-center justify-center rounded-xl p-1.5 text-slate-500 hover:bg-white/10 hover:text-white"
            aria-label="Sidebar хаах"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mx-3.5 h-px bg-white/10" />

      <nav className="flex-1 overflow-visible px-2.5 py-3 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const label = language === "mn" ? item.labelMn : item.labelEn;
          const badge = item.showBadge && badgeCount > 0 ? badgeCount : null;

          return (
            <div key={item.key} className="group relative">
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-gradient-to-r from-[#0072ce] to-indigo-600 text-white shadow-md shadow-[#0072ce]/20"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="relative shrink-0">
                  <Icon className="h-5 w-5" />
                  {collapsed && badge && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{label}</span>
                    {badge && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </>
                )}
              </Link>

              {collapsed && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-x-1 -translate-y-1/2 scale-95 opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100"
                >
                  <div className="relative flex items-center">
                    <div className="absolute -left-1.5 h-2.5 w-2.5 rotate-45 rounded-[2px] border-b border-l border-white/10 bg-[#141b2d]" />
                    <div className="whitespace-nowrap rounded-xl border border-white/10 bg-[#141b2d] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6),0_0_0_1px_rgba(0,114,206,0.15)]">
                      {label}
                      {badge ? ` (${badge})` : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      <aside
        className={`hidden md:block shrink-0 py-3 pl-3 transition-all duration-200 ${collapsed ? "w-[92px]" : "w-[264px]"}`}
      >
        <SidebarPanel
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
          isMobile={false}
        />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onCloseMobile}
          />
          <div className="absolute left-0 top-0 h-full w-[264px]">
            <SidebarPanel
              collapsed={false}
              onToggleCollapsed={onToggleCollapsed}
              onCloseMobile={onCloseMobile}
              isMobile
            />
          </div>
        </div>
      )}
    </>
  );
}
