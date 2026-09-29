"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  Plus,
  X,
  Pencil,
  Trash2,
  Power,
  AlertTriangle,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Upload,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  GUIDE_AUDIENCES,
  MAX_GUIDE_SIZE,
  formatBytes,
  optimizePdf,
  type GuideAudience,
  type SystemGuide,
} from "@/lib/systemGuides";
import { DashboardShell } from "../DashboardShell";

type UploadStage = "idle" | "optimizing" | "uploading" | "saving";

/**
 * PDF-ийг blob руу шууд байршуулна (SAS URL). Vercel function-ээр
 * дамжуулахгүй — 4.5MB body хязгаартай тул.
 */
async function uploadGuideFile(
  authorizedFetch: (input: string, init?: RequestInit) => Promise<Response>,
  file: File,
  language: string,
): Promise<{ blobPath: string; size: number }> {
  const urlRes = await authorizedFetch("/api/system-guides/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
    }),
  });
  const urlData = await urlRes.json();
  if (!urlRes.ok) throw new Error(urlData.error || "Алдаа гарлаа.");

  const putRes = await fetch(urlData.uploadUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": "application/pdf",
    },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(
      language === "mn"
        ? "Файл байршуулахад алдаа гарлаа."
        : "Failed to upload file.",
    );
  }

  return { blobPath: urlData.blobPath, size: file.size };
}

function GuideFormModal({
  mode,
  initialGuide,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initialGuide?: SystemGuide;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: (guide: SystemGuide) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();

  const [title, setTitle] = useState(initialGuide?.title ?? "");
  const [description, setDescription] = useState(
    initialGuide?.description ?? "",
  );
  const [audience, setAudience] = useState<GuideAudience[]>(
    initialGuide?.audience ?? ["company", "department"],
  );
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const isBusy = stage !== "idle";

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isBusy) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isBusy]);

  function toggleAudience(value: GuideAudience) {
    setAudience((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value],
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFormError(null);
    if (!selected) return;

    if (
      selected.type !== "application/pdf" &&
      !selected.name.toLowerCase().endsWith(".pdf")
    ) {
      setFormError(
        language === "mn"
          ? "Зөвхөн PDF файл оруулна уу."
          : "Only PDF files are allowed.",
      );
      e.target.value = "";
      return;
    }
    if (selected.size > MAX_GUIDE_SIZE) {
      setFormError(
        language === "mn"
          ? `Файлын хэмжээ ${formatBytes(MAX_GUIDE_SIZE)}-с бага байх ёстой.`
          : `File must be under ${formatBytes(MAX_GUIDE_SIZE)}.`,
      );
      e.target.value = "";
      return;
    }
    setFile(selected);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length < 2) {
      setFormError(
        language === "mn"
          ? "Гарчиг дор хаяж 2 тэмдэгттэй байх ёстой."
          : "Title must be at least 2 characters.",
      );
      return;
    }
    if (audience.length === 0) {
      setFormError(
        language === "mn"
          ? "Хэнд харагдахыг дор хаяж нэгийг сонгоно уу."
          : "Select at least one audience.",
      );
      return;
    }
    if (mode === "create" && !file) {
      setFormError(
        language === "mn" ? "PDF файл сонгоно уу." : "Please select a PDF file.",
      );
      return;
    }

    try {
      let uploaded: { blobPath: string; size: number } | null = null;

      if (file) {
        setStage("optimizing");
        const optimized = await optimizePdf(file);
        setStage("uploading");
        uploaded = await uploadGuideFile(authorizedFetch, optimized, language);
      }

      setStage("saving");
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        audience,
      };
      if (uploaded) {
        payload.blob_path = uploaded.blobPath;
        payload.file_size_bytes = uploaded.size;
      }
      if (mode === "create") {
        payload.sort_order = nextSortOrder;
      }

      const res = await authorizedFetch(
        mode === "create"
          ? "/api/system-guides"
          : `/api/system-guides/${initialGuide!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");

      onSaved(data.guide);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setStage("idle");
    }
  }

  const stageLabel: Record<Exclude<UploadStage, "idle">, string> = {
    optimizing: language === "mn" ? "Файлыг оновчилж байна…" : "Optimizing…",
    uploading: language === "mn" ? "Байршуулж байна…" : "Uploading…",
    saving: language === "mn" ? "Хадгалж байна…" : "Saving…",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isBusy && onClose()}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="dash-card relative w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">
            {mode === "create"
              ? language === "mn"
                ? "Шинэ заавар нэмэх"
                : "Add new guide"
              : language === "mn"
                ? "Заавар засах"
                : "Edit guide"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label={language === "mn" ? "Хаах" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            >
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Гарчиг" : "Title"}
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isBusy}
              maxLength={200}
              placeholder={
                language === "mn"
                  ? "Жишээ нь: Сарын тайлан бөглөх заавар"
                  : "e.g. How to submit monthly reports"
              }
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Тайлбар (заавал биш)" : "Description (optional)"}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isBusy}
              maxLength={1000}
              rows={3}
              className="glass-input mt-2 w-full resize-none rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Хэнд харагдах" : "Visible to"}
            </p>
            <div className="mt-2 space-y-2">
              {GUIDE_AUDIENCES.map((a) => (
                <label
                  key={a.value}
                  className="flex items-center gap-2 text-sm text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={audience.includes(a.value)}
                    onChange={() => toggleAudience(a.value)}
                    disabled={isBusy}
                  />
                  {language === "mn" ? a.mn : a.en}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {mode === "create"
                ? language === "mn"
                  ? "PDF файл"
                  : "PDF file"
                : language === "mn"
                  ? "Файл солих (заавал биш)"
                  : "Replace file (optional)"}
            </p>
            <label
              htmlFor="guide-file-input"
              className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-3.5 transition-colors hover:border-white/40"
            >
              <Upload className="h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0 text-xs text-slate-400">
                {file ? (
                  <>
                    <p className="truncate font-semibold text-slate-200">
                      {file.name}
                    </p>
                    <p className="mt-0.5">{formatBytes(file.size)}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-300">
                      {language === "mn" ? "PDF сонгох" : "Choose PDF"}
                    </p>
                    <p className="mt-0.5">
                      {language === "mn"
                        ? `дээд тал нь ${formatBytes(MAX_GUIDE_SIZE)}`
                        : `max ${formatBytes(MAX_GUIDE_SIZE)}`}
                    </p>
                  </>
                )}
              </div>
            </label>
            <input
              id="guide-file-input"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              disabled={isBusy}
              className="hidden"
            />
            {mode === "edit" && initialGuide && (
              <p className="mt-1.5 text-xs text-slate-500">
                {language === "mn"
                  ? `Одоогийн хувилбар: v${initialGuide.version} · ${formatBytes(initialGuide.file_size_bytes)}`
                  : `Current version: v${initialGuide.version} · ${formatBytes(initialGuide.file_size_bytes)}`}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            {isBusy && (
              <span className="mr-auto text-xs text-slate-400">
                {stageLabel[stage as Exclude<UploadStage, "idle">]}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {language === "mn" ? "Цуцлах" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 transition-all disabled:opacity-50"
            >
              {language === "mn" ? "Хадгалах" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteGuideModal({
  guide,
  onClose,
  onDeleted,
}: {
  guide: SystemGuide;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await authorizedFetch(`/api/system-guides/${guide.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Алдаа гарлаа.");
      }
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsDeleting(false);
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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mt-4 font-serif text-lg text-white">
          {language === "mn" ? "Зааврыг устгах уу?" : "Delete this guide?"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {language === "mn"
            ? `"${guide.title}" заавар бүх хэрэглэгчийн жагсаалтаас хасагдана. Түр нуух бол "Идэвхгүй болгох"-ыг ашиглана уу.`
            : `"${guide.title}" will be removed for everyone. To hide it temporarily, deactivate it instead.`}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {language === "mn" ? "Цуцлах" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/25 transition-all hover:bg-rose-500 disabled:opacity-50"
          >
            {isDeleting
              ? language === "mn"
                ? "Устгаж байна…"
                : "Deleting…"
              : language === "mn"
                ? "Устгах"
                : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GuidesPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [guides, setGuides] = useState<SystemGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<SystemGuide | null>(null);
  const [deletingGuide, setDeletingGuide] = useState<SystemGuide | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    if (!isInitializing && !user) router.replace("/login");
  }, [isInitializing, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        // Backend role-оор шүүнэ: super_admin бүгдийг (идэвхгүй ч гэсэн),
        // бусад нь зөвхөн идэвхтэй + өөрийн role-д зориулсныг авна.
        const res = await authorizedFetch("/api/system-guides");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
        if (!cancelled) setGuides(data.guides);
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

  const sortedGuides = useMemo(
    () =>
      [...guides].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [guides],
  );

  const nextSortOrder =
    guides.length > 0 ? Math.max(...guides.map((g) => g.sort_order)) + 1 : 0;

  async function handleOpen(guide: SystemGuide) {
    setActionError(null);
    // Popup blocker-оос сэргийлж tab-ийг click дотор шууд нээгээд,
    // SAS link ирэхэд чиглүүлнэ.
    const win = window.open("", "_blank");
    setBusyId(guide.id);
    try {
      const res = await authorizedFetch(
        `/api/system-guides/${guide.id}/view-url`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
      if (win) {
        win.opener = null;
        win.location.href = data.url;
      } else {
        window.location.href = data.url;
      }
    } catch (err) {
      win?.close();
      setActionError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(guide: SystemGuide) {
    setActionError(null);
    setBusyId(guide.id);
    try {
      const res = await authorizedFetch(`/api/system-guides/${guide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !guide.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
      setGuides((prev) => prev.map((g) => (g.id === guide.id ? data.guide : g)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sortedGuides.length) return;

    const reordered = [...sortedGuides];
    const current = reordered[index];
    const neighbor = reordered[target];
    if (!current || !neighbor) return;
    reordered[index] = neighbor;
    reordered[target] = current;

    // sort_order-ийг 0,1,2… болгож хэвийн болгоно — зөвхөн өөрчлөгдсөнийг илгээнэ.
    const changes = reordered
      .map((g, i) => ({ guide: g, order: i }))
      .filter(({ guide, order }) => guide.sort_order !== order);

    setActionError(null);
    setIsReordering(true);
    try {
      const results = await Promise.all(
        changes.map(async ({ guide, order }) => {
          const res = await authorizedFetch(`/api/system-guides/${guide.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: order }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
          return data.guide as SystemGuide;
        }),
      );
      setGuides((prev) =>
        prev.map((g) => results.find((r) => r.id === g.id) ?? g),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsReordering(false);
    }
  }

  if (isInitializing || !user) {
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
              {language === "mn" ? "Системийн заавар" : "System guides"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {isSuperAdmin
                ? language === "mn"
                  ? "PDF заавар оруулж, хэнд харагдахыг тохируулна."
                  : "Upload PDF guides and choose who can see them."
                : language === "mn"
                  ? "Системийг ашиглах заавар, гарын авлагууд."
                  : "Guides and manuals for using the system."}
            </p>
          </div>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 transition-transform active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              {language === "mn" ? "Заавар нэмэх" : "Add guide"}
            </button>
          )}
        </div>

        {actionError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {actionError}
          </div>
        )}

        <div className="dash-card overflow-hidden rounded-3xl">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
            </p>
          ) : loadError ? (
            <p className="px-4 py-8 text-center text-sm text-rose-300">
              {loadError}
            </p>
          ) : sortedGuides.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <BookOpen className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">
                {isSuperAdmin
                  ? language === "mn"
                    ? "Заавар оруулаагүй байна. Дээрх товчоор нэмнэ үү."
                    : "No guides yet. Add one above."
                  : language === "mn"
                    ? "Одоогоор заавар байхгүй байна."
                    : "No guides available yet."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {sortedGuides.map((guide, index) => (
                <li
                  key={guide.id}
                  className={`flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap ${
                    guide.is_active ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white" title={guide.title}>
                      {guide.title}
                    </p>
                    {guide.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                        {guide.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {formatBytes(guide.file_size_bytes)} · v{guide.version} ·{" "}
                      {language === "mn" ? "Шинэчилсэн" : "Updated"}{" "}
                      {new Date(guide.updated_at).toLocaleDateString(
                        language === "mn" ? "mn-MN" : "en-US",
                      )}
                    </p>
                    {isSuperAdmin && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {GUIDE_AUDIENCES.filter((a) =>
                          guide.audience.includes(a.value),
                        ).map((a) => (
                          <span
                            key={a.value}
                            className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-300"
                          >
                            {language === "mn" ? a.mn : a.en}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpen(guide)}
                      disabled={busyId === guide.id}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-500/15 disabled:opacity-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {language === "mn" ? "Нээх" : "Open"}
                    </button>

                    {isSuperAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMove(index, -1)}
                          disabled={index === 0 || isReordering}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                          aria-label={language === "mn" ? "Дээш" : "Move up"}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 1)}
                          disabled={
                            index === sortedGuides.length - 1 || isReordering
                          }
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                          aria-label={language === "mn" ? "Доош" : "Move down"}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(guide)}
                          disabled={busyId === guide.id}
                          className={`flex items-center justify-center rounded-lg p-2 transition-colors disabled:opacity-50 ${
                            guide.is_active
                              ? "text-emerald-300 hover:bg-emerald-500/15"
                              : "text-slate-500 hover:bg-white/10"
                          }`}
                          title={
                            guide.is_active
                              ? language === "mn"
                                ? "Идэвхтэй — дарж нуух"
                                : "Active — click to hide"
                              : language === "mn"
                                ? "Идэвхгүй — дарж харуулах"
                                : "Inactive — click to show"
                          }
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGuide(guide)}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                          aria-label={language === "mn" ? "Засах" : "Edit"}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingGuide(guide)}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                          aria-label={language === "mn" ? "Устгах" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {createOpen && (
        <GuideFormModal
          mode="create"
          nextSortOrder={nextSortOrder}
          onClose={() => setCreateOpen(false)}
          onSaved={(g) => setGuides((prev) => [...prev, g])}
        />
      )}
      {editingGuide && (
        <GuideFormModal
          mode="edit"
          initialGuide={editingGuide}
          nextSortOrder={nextSortOrder}
          onClose={() => setEditingGuide(null)}
          onSaved={(updated) =>
            setGuides((prev) =>
              prev.map((g) => (g.id === updated.id ? updated : g)),
            )
          }
        />
      )}
      {deletingGuide && (
        <DeleteGuideModal
          guide={deletingGuide}
          onClose={() => setDeletingGuide(null)}
          onDeleted={() =>
            setGuides((prev) => prev.filter((g) => g.id !== deletingGuide.id))
          }
        />
      )}
    </DashboardShell>
  );
}