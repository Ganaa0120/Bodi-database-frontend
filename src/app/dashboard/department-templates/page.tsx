"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Plus, X, Trash2, Settings2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DepartmentTemplate } from "@/lib/types";
import { DashboardShell } from "../DashboardShell";
import { ManageFieldsModal } from "../ManageFieldsModal";

function CreateTemplateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (t: DepartmentTemplate) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError(
        language === "mn"
          ? "Нэр дор хаяж 2 тэмдэгттэй байх ёстой."
          : "Name must be at least 2 characters.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authorizedFetch("/api/department-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
      onCreated(data.template);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="dash-card relative w-full max-w-sm rounded-3xl p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">
            {language === "mn"
              ? "Шинэ хэлтэсийн загвар"
              : "New department template"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            >
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Хэлтэсийн нэр" : "Department name"}
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                language === "mn"
                  ? "Жишээ нь: Human Resource, Finance, IT"
                  : "e.g. Human Resource, Finance, IT"
              }
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
            >
              {language === "mn" ? "Цуцлах" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 disabled:opacity-50"
            >
              {isSubmitting
                ? language === "mn"
                  ? "Хадгалж байна…"
                  : "Saving…"
                : language === "mn"
                  ? "Хадгалах"
                  : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DepartmentTemplatesPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [templates, setTemplates] = useState<DepartmentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [managingTemplate, setManagingTemplate] =
    useState<DepartmentTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !user) router.replace("/login");
    else if (!isInitializing && user && user.role !== "super_admin")
      router.replace("/dashboard");
  }, [isInitializing, user, router]);

  useEffect(() => {
    if (!user || user.role !== "super_admin") return;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await authorizedFetch("/api/department-templates");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
        if (!cancelled) setTemplates(data.templates);
      } catch (err) {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : "Алдаа гарлаа.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, authorizedFetch]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await authorizedFetch(`/api/department-templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Алдаа гарлаа.");
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  if (isInitializing || !user || user.role !== "super_admin") {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">
          {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
        </p>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card flex flex-wrap items-center justify-between gap-3 rounded-3xl px-6 py-5">
          <div>
            <h1 className="font-serif text-2xl text-white">
              {language === "mn" ? "Хэлтэсийн загвар" : "Department Templates"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {language === "mn"
                ? "Компаниуд хэлтэс үүсгэхдээ энэ жагсаалтаас сонгоно. Талбар удирдах товчоор бөглөх маягтын бүтцийг тохируулна."
                : "Companies select from this list. Manage fields to define what each department fills in."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            {language === "mn" ? "Загвар нэмэх" : "Add template"}
          </button>
        </div>

        <div className="dash-card overflow-hidden rounded-3xl">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
            </p>
          ) : loadError ? (
            <p className="px-4 py-8 text-center text-sm text-rose-300">
              {loadError}
            </p>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <LayoutTemplate className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">
                {language === "mn"
                  ? "Загвар байхгүй байна. Дээрх товчоор нэмнэ үү."
                  : "No templates yet. Add one above."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div>
                    <span className="text-sm font-medium text-white">
                      {t.name}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      {t.form_schema.length}{" "}
                      {language === "mn" ? "талбар" : "fields"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setManagingTemplate(t)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      {language === "mn" ? "Талбар удирдах" : "Manage fields"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-50"
                      aria-label={language === "mn" ? "Устгах" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateTemplateModal
          onClose={() => setCreateOpen(false)}
          onCreated={(t) => setTemplates((prev) => [...prev, t])}
        />
      )}
      {managingTemplate && (
        <ManageFieldsModal
          template={managingTemplate}
          onClose={() => setManagingTemplate(null)}
          onUpdated={(updated) =>
            setTemplates((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t)),
            )
          }
        />
      )}
    </DashboardShell>
  );
}
