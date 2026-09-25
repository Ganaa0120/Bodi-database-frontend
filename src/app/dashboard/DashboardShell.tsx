"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { DashboardNavbar } from "./DashboardNavbar";

const STORAGE_KEY = "bodi-sidebar-collapsed";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Зураг + цагаан overlay-г НЭГ давхарга дотор, "absolute" (эцэг
          нь "relative h-screen" тул найдвартай бэхлэгдэнэ — "fixed"-ийн
          зарим browser дээрх containing-block gotcha-с зайлсхийнэ) */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: " url('/images/cd77a781-4762-482a-a067-22b172368814.jpg')",
        }}
      />

      <div className="relative z-10 flex h-full overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex flex-1 flex-col overflow-hidden gap-3 p-3">
          <DashboardNavbar onOpenMobileSidebar={() => setMobileOpen(true)} />

          <main className="flex-1 overflow-y-auto p-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
