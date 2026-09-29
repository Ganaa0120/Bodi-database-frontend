"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Mail,
  MailOpen,
  Send,
  Plus,
  X,
  Eye,
  Trash2,
  AlertTriangle,
  Search,
  CheckCheck,
  Users,
  Paperclip,
  ImageIcon,
  FileText,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE,
  NOTIFICATIONS_ARRIVED_EVENT,
  emitNotificationsChanged,
  formatBytes,
  formatDateTime,
  isImageType,
  resolveAttachmentType,
  type NotificationAttachment,
  type InboxNotification,
  type NotificationTarget,
  type RecipientOption,
  type RecipientStatus,
  type SentNotification,
} from "@/lib/notifications";
import { DashboardShell } from "../DashboardShell";

type AuthorizedFetch = (input: string, init?: RequestInit) => Promise<Response>;

async function fetchJson<T>(
  authorizedFetch: AuthorizedFetch,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await authorizedFetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Алдаа гарлаа.");
  return data as T;
}

function roleLabel(role: string, language: string) {
  if (role === "company") return language === "mn" ? "CEO" : "CEO";
  return language === "mn" ? "Хэлтсийн админ" : "Dept. admin";
}

/* ───────────────────────── Modal shell ───────────────────────── */

/**
 * Responsive modal:
 *  - Утсан дээр доороос гарч ирэх "sheet" (дэлгэцийн бүх өргөн).
 *  - sm+ дэлгэцэн дээр голд байрлах карт.
 *  - Гарчиг, footer тогтмол; зөвхөн дунд хэсэг scroll хийгдэнэ (давхар scroll үгүй).
 */
function Modal({
  title,
  subtitle,
  onClose,
  footer,
  maxWidth = "sm:max-w-lg",
  disableClose = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  maxWidth?: string;
  disableClose?: boolean;
  children: React.ReactNode;
}) {
  const { language } = useLanguage();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !disableClose) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    // Ард байгаа хуудас modal-ын хамт scroll хийгдэхгүй.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, disableClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !disableClose && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`dash-card relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[85vh] sm:rounded-3xl ${maxWidth}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            <h2 className="break-words font-serif text-lg text-white sm:text-xl">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label={language === "mn" ? "Хаах" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7 sm:py-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-white/10 px-5 py-4 sm:px-7">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
    >
      {message}
    </div>
  );
}

/* ───────────────────────── Хавсралт харуулах ───────────────────────── */

/**
 * Мэдэгдлийн хавсралтууд. Зураг — thumbnail (дарахад шинэ tab-д бүтэн
 * хэмжээгээр), бусад файл — нэр, хэмжээ, татах товч. Link-үүд 15 минут
 * хүчинтэй тул modal нээх бүрт шинээр авна.
 */
function AttachmentList({ notificationId }: { notificationId: string }) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const [items, setItems] = useState<NotificationAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ attachments: NotificationAttachment[] }>(
      authorizedFetch,
      `/api/notifications/${notificationId}/attachments`,
    )
      .then((data) => {
        if (!cancelled) setItems(data.attachments);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authorizedFetch, notificationId]);

  const images = items.filter((a) => isImageType(a.content_type));
  const files = items.filter((a) => !isImageType(a.content_type));

  return (
    <div className="mt-5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Paperclip className="h-3.5 w-3.5" />
        {language === "mn" ? "Хавсралт" : "Attachments"}
      </p>

      {isLoading ? (
        <p className="mt-2 text-xs text-slate-500">{language === "mn" ? "Ачааллаж байна…" : "Loading…"}</p>
      ) : error ? (
        <p className="mt-2 text-xs text-rose-300">{error}</p>
      ) : (
        <div className="mt-2 space-y-2.5">
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {images.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={a.file_name}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-white/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt={a.file_name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </a>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 transition-colors hover:bg-white/10"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-sky-300" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">{a.file_name}</span>
                      <span className="block text-[11px] text-slate-500">{formatBytes(a.file_size_bytes)}</span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-slate-400" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Super admin: compose ───────────────────────── */

/** Хавсралтыг blob руу шууд байршуулна (Vercel-ээр дамжихгүй). */
async function uploadAttachment(
  authorizedFetch: AuthorizedFetch,
  file: File,
  contentType: string,
  language: string,
): Promise<{ blob_path: string; file_name: string; content_type: string }> {
  const { uploadUrl, blobPath } = await fetchJson<{ uploadUrl: string; blobPath: string }>(
    authorizedFetch,
    "/api/notifications/attachments/upload-url",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, fileSize: file.size }),
    },
  );

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) {
    throw new Error(
      language === "mn"
        ? `"${file.name}" файлыг байршуулахад алдаа гарлаа.`
        : `Failed to upload "${file.name}".`,
    );
  }

  return { blob_path: blobPath, file_name: file.name, content_type: contentType };
}

function ComposeModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (n: SentNotification) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<NotificationTarget>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [files, setFiles] = useState<{ file: File; type: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  const [options, setOptions] = useState<RecipientOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ recipients: RecipientOption[] }>(
      authorizedFetch,
      "/api/notifications/recipients",
    )
      .then((data) => {
        if (!cancelled) setOptions(data.recipients);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authorizedFetch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      [o.full_name, o.email, o.company_name, o.department_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [options, search]);

  // Компаниар бүлэглэнэ (backend аль хэдийн эрэмбэлсэн).
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; members: RecipientOption[] }>();
    for (const o of filtered) {
      const group = map.get(o.company_id) ?? { name: o.company_name, members: [] };
      group.members.push(o);
      map.set(o.company_id, group);
    }
    return [...map.entries()];
  }, [filtered]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(members: RecipientOption[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = members.every((m) => next.has(m.id));
      for (const m of members) {
        if (allOn) next.delete(m.id);
        else next.add(m.id);
      }
      return next;
    });
  }

  function selectByRole(role: RecipientOption["role"]) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const o of options) if (o.role === role) next.add(o.id);
      return next;
    });
  }

  function handleFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // ижил файлыг дахин сонгох боломжтой байлгана
    if (picked.length === 0) return;
    setError(null);

    const next = [...files];
    for (const file of picked) {
      const type = resolveAttachmentType(file);
      if (!type) {
        setError(
          language === "mn"
            ? `"${file.name}": зөвхөн зураг (PNG, JPG, WEBP), PDF, Word, Excel, PowerPoint хавсаргана.`
            : `"${file.name}": only images (PNG, JPG, WEBP), PDF, Word, Excel, PowerPoint are allowed.`,
        );
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setError(
          language === "mn"
            ? `"${file.name}": файлын хэмжээ ${formatBytes(MAX_ATTACHMENT_SIZE)}-с хэтэрсэн байна.`
            : `"${file.name}" exceeds ${formatBytes(MAX_ATTACHMENT_SIZE)}.`,
        );
        continue;
      }
      if (next.length >= MAX_ATTACHMENTS) {
        setError(
          language === "mn"
            ? `Дээд тал нь ${MAX_ATTACHMENTS} файл хавсаргана.`
            : `You can attach up to ${MAX_ATTACHMENTS} files.`,
        );
        break;
      }
      next.push({ file, type });
    }
    setFiles(next);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const recipientCount = target === "all" ? options.length : selected.size;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError(language === "mn" ? "Гарчиг дор хаяж 2 тэмдэгттэй байх ёстой." : "Title must be at least 2 characters.");
      return;
    }
    if (body.trim().length < 1) {
      setError(language === "mn" ? "Мэдэгдлийн агуулгыг бичнэ үү." : "Please enter a message.");
      return;
    }
    if (target === "selected" && selected.size === 0) {
      setError(language === "mn" ? "Дор хаяж нэг хүлээн авагч сонгоно уу." : "Select at least one recipient.");
      return;
    }

    setIsSending(true);
    try {
      // 1) Хавсралтууд (байвал) — нэг нэгээр байршуулна
      const attachments: { blob_path: string; file_name: string; content_type: string }[] = [];
      if (files.length > 0) {
        setUploadProgress({ done: 0, total: files.length });
        for (const { file, type } of files) {
          attachments.push(await uploadAttachment(authorizedFetch, file, type, language));
          setUploadProgress({ done: attachments.length, total: files.length });
        }
      }

      // 2) Мэдэгдэл
      const data = await fetchJson<{ notification: SentNotification }>(
        authorizedFetch,
        "/api/notifications",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            target,
            user_ids: target === "selected" ? [...selected] : undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
          }),
        },
      );
      onSent(data.notification);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsSending(false);
      setUploadProgress(null);
    }
  }

  const FORM_ID = "notification-compose-form";

  return (
    <Modal
      title={language === "mn" ? "Шинэ мэдэгдэл" : "New notification"}
      onClose={onClose}
      maxWidth="sm:max-w-2xl"
      disableClose={isSending}
      footer={
        <>
          <span className="mr-auto text-xs text-slate-400">
            {language === "mn" ? `${recipientCount} хүнд илгээгдэнэ` : `${recipientCount} recipients`}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {language === "mn" ? "Цуцлах" : "Cancel"}
          </button>
          <button
            type="submit"
            form={FORM_ID}
            disabled={isSending || optionsLoading || recipientCount === 0}
            className="flex items-center gap-2 rounded-xl bg-[#0071BB] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0071BB]/25 transition-all disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isSending
              ? uploadProgress && uploadProgress.done < uploadProgress.total
                ? language === "mn"
                  ? `Файл байршуулж байна… (${uploadProgress.done}/${uploadProgress.total})`
                  : `Uploading… (${uploadProgress.done}/${uploadProgress.total})`
                : language === "mn"
                  ? "Илгээж байна…"
                  : "Sending…"
              : language === "mn"
                ? "Илгээх"
                : "Send"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBox message={error} />}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            {language === "mn" ? "Гарчиг" : "Title"}
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSending}
            maxLength={200}
            placeholder={language === "mn" ? "Жишээ нь: Q3 тайлан оруулах хугацаа" : "e.g. Q3 report deadline"}
            className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            {language === "mn" ? "Агуулга" : "Message"}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isSending}
            maxLength={5000}
            rows={5}
            className="glass-input mt-2 w-full resize-y rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
          />
          <p className="mt-1 text-right text-[11px] text-slate-500">{body.length} / 5000</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {language === "mn" ? "Хавсралт (заавал биш)" : "Attachments (optional)"}
          </p>

          {files.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {files.map(({ file, type }, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  {isImageType(type) ? (
                    <ImageIcon className="h-4 w-4 shrink-0 text-emerald-300" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-sky-300" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{file.name}</span>
                    <span className="block text-[11px] text-slate-500">{formatBytes(file.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={isSending}
                    className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
                    aria-label={language === "mn" ? "Хасах" : "Remove"}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {files.length < MAX_ATTACHMENTS && (
            <label
              className={`mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/40 ${
                isSending ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 text-xs text-slate-400">
                <span className="block font-semibold text-slate-300">
                  {language === "mn" ? "Файл хавсаргах" : "Attach files"}
                </span>
                <span className="block">
                  {language === "mn"
                    ? `Зураг, PDF, Word, Excel, PowerPoint · нэг файл ${formatBytes(MAX_ATTACHMENT_SIZE)} хүртэл · дээд тал нь ${MAX_ATTACHMENTS}`
                    : `Images, PDF, Word, Excel, PowerPoint · up to ${formatBytes(MAX_ATTACHMENT_SIZE)} each · max ${MAX_ATTACHMENTS}`}
                </span>
              </span>
              <input
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                onChange={handleFilesPicked}
                disabled={isSending}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {language === "mn" ? "Хүлээн авагч" : "Recipients"}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["all", "selected"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTarget(value)}
                disabled={isSending}
                className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  target === value
                    ? "border-[#0071BB] bg-[#0071BB]/20 text-white"
                    : "border-white/10 text-slate-400 hover:bg-white/5"
                }`}
              >
                {value === "all"
                  ? language === "mn"
                    ? "Бүх админд"
                    : "All admins"
                  : language === "mn"
                    ? "Сонгож илгээх"
                    : "Select recipients"}
              </button>
            ))}
          </div>

          {target === "all" && (
            <p className="mt-2.5 flex items-center gap-2 text-xs text-slate-400">
              <Users className="h-3.5 w-3.5 shrink-0" />
              {optionsLoading
                ? language === "mn"
                  ? "Ачааллаж байна…"
                  : "Loading…"
                : language === "mn"
                  ? `Бүх идэвхтэй CEO болон хэлтсийн админ — нийт ${options.length} хүн`
                  : `All active CEOs and department admins — ${options.length} people`}
            </p>
          )}

          {target === "selected" && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02]">
              {/* Toolbar нь жагсаалт урт үед ч scroll хийхэд дээр наалдаж үлдэнэ */}
              <div className="sticky -top-4 z-10 flex flex-wrap items-center gap-2 rounded-t-2xl border-b border-white/10 bg-[#0e1626]/95 p-3 backdrop-blur sm:-top-5">
                <div className="relative w-full sm:w-auto sm:min-w-[180px] sm:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={language === "mn" ? "Нэр, имэйл, компани…" : "Name, email, company…"}
                    className="glass-input w-full rounded-lg py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => selectByRole("company")}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/15"
                >
                  {language === "mn" ? "+ Бүх CEO" : "+ All CEOs"}
                </button>
                <button
                  type="button"
                  onClick={() => selectByRole("department")}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/15"
                >
                  {language === "mn" ? "+ Бүх хэлтсийн админ" : "+ All dept. admins"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  disabled={selected.size === 0}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/10 disabled:opacity-40"
                >
                  {language === "mn" ? "Цэвэрлэх" : "Clear"}
                </button>
              </div>

              <div className="p-2">
                {optionsLoading ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-400">
                    {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
                  </p>
                ) : groups.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-500">
                    {language === "mn" ? "Илэрц олдсонгүй." : "No matches."}
                  </p>
                ) : (
                  groups.map(([companyId, group]) => {
                    const allOn = group.members.every((m) => selected.has(m.id));
                    return (
                      <div key={companyId} className="mb-2 last:mb-0">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={allOn}
                            onChange={() => toggleGroup(group.members)}
                          />
                          <span className="truncate">{group.name}</span>
                        </label>
                        {group.members.map((m) => (
                          <label
                            key={m.id}
                            className="ml-3 flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5 sm:ml-5"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(m.id)}
                              onChange={() => toggle(m.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-white">{m.full_name}</span>
                              <span className="block truncate text-[11px] text-slate-500">
                                {m.role === "company"
                                  ? roleLabel(m.role, language)
                                  : `${m.department_name ?? ""} · ${roleLabel(m.role, language)}`}{" "}
                                · {m.email}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────── Super admin: detail ───────────────────────── */

function SentDetailModal({
  notification,
  onClose,
}: {
  notification: SentNotification;
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const [recipients, setRecipients] = useState<RecipientStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ recipients: RecipientStatus[] }>(
      authorizedFetch,
      `/api/notifications/${notification.id}/recipients`,
    )
      .then((data) => {
        if (!cancelled) setRecipients(data.recipients);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authorizedFetch, notification.id]);

  const readCount = recipients.filter((r) => r.read_at).length;

  return (
    <Modal
      title={notification.title}
      subtitle={formatDateTime(notification.created_at, language)}
      onClose={onClose}
      maxWidth="sm:max-w-2xl"
    >
      <div className="whitespace-pre-wrap break-words rounded-2xl bg-white/5 px-4 py-3.5 text-sm leading-relaxed text-slate-200">
        {notification.body}
      </div>

      {notification.attachment_count > 0 && <AttachmentList notificationId={notification.id} />}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {language === "mn" ? "Хүлээн авагчид" : "Recipients"}
        </p>
        {!isLoading && !error && (
          <p className="text-xs text-slate-400">
            {language === "mn"
              ? `${recipients.length}-аас ${readCount} уншсан`
              : `${readCount} of ${recipients.length} read`}
          </p>
        )}
      </div>

      <div className="mt-2 overflow-hidden rounded-2xl border border-white/10">
        {isLoading ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
          </p>
        ) : error ? (
          <p className="px-4 py-6 text-center text-sm text-rose-300">{error}</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {recipients.map((r) => (
              <li key={r.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                {r.read_at ? (
                  <MailOpen className="h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                  <Mail className="h-4 w-4 shrink-0 text-[#F48120]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{r.full_name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {r.company_name}
                    {r.department_name ? ` · ${r.department_name}` : ""} · {roleLabel(r.role, language)}
                  </p>
                </div>
                <span
                  className={`w-full pl-7 text-[11px] sm:w-auto sm:pl-0 ${r.read_at ? "text-emerald-300" : "text-slate-500"}`}
                >
                  {r.read_at
                    ? formatDateTime(r.read_at, language)
                    : language === "mn"
                      ? "Уншаагүй"
                      : "Unread"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function DeleteModal({
  notification,
  onClose,
  onDeleted,
}: {
  notification: SentNotification;
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
      const res = await authorizedFetch(`/api/notifications/${notification.id}`, {
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
    <Modal
      title={language === "mn" ? "Мэдэгдлийг устгах уу?" : "Delete this notification?"}
      onClose={onClose}
      maxWidth="sm:max-w-md"
      disableClose={isDeleting}
      footer={
        <>
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
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-400">
          {language === "mn"
            ? `"${notification.title}" мэдэгдэл бүх хүлээн авагчийн жагсаалтаас алга болно.`
            : `"${notification.title}" will be removed from every recipient's inbox.`}
        </p>
      </div>
      {error && (
        <div className="mt-3">
          <ErrorBox message={error} />
        </div>
      )}
    </Modal>
  );
}

function AdminView() {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();

  const [items, setItems] = useState<SentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewing, setViewing] = useState<SentNotification | null>(null);
  const [deleting, setDeleting] = useState<SentNotification | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ notifications: SentNotification[] }>(authorizedFetch, "/api/notifications/sent")
      .then((data) => {
        if (!cancelled) setItems(data.notifications);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Алдаа гарлаа.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authorizedFetch]);

  return (
    <div className="space-y-4">
      <div className="dash-card flex flex-wrap items-center justify-between gap-3 rounded-3xl px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <h1 className="font-serif text-xl text-white sm:text-2xl">
            {language === "mn" ? "Мэдэгдэл" : "Notifications"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {language === "mn"
              ? "CEO болон хэлтсийн админуудад системээр мэдэгдэл илгээнэ."
              : "Send in-app notifications to CEOs and department admins."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[#0071BB] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0071BB]/25 transition-transform active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {language === "mn" ? "Шинэ мэдэгдэл" : "New notification"}
        </button>
      </div>

      <div className="dash-card overflow-hidden rounded-3xl">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
          </p>
        ) : loadError ? (
          <p className="px-4 py-8 text-center text-sm text-rose-300">{loadError}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Bell className="h-8 w-8 text-slate-500" />
            <p className="text-sm text-slate-400">
              {language === "mn" ? "Илгээсэн мэдэгдэл алга." : "No notifications sent yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((n) => {
              const percent = n.recipient_count > 0 ? Math.round((n.read_count / n.recipient_count) * 100) : 0;
              return (
                <li key={n.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0071BB]/15 text-sky-300">
                    <Send className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white" title={n.title}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{n.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(n.created_at, language)} ·{" "}
                      {n.target_type === "all"
                        ? language === "mn"
                          ? "Бүх админд"
                          : "All admins"
                        : language === "mn"
                          ? "Сонгосон"
                          : "Selected"}
                      {n.attachment_count > 0 && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle">
                          · <Paperclip className="h-3 w-3" /> {n.attachment_count}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="order-last w-full sm:order-none sm:w-32 sm:shrink-0">
                    <p className="text-xs text-slate-300 sm:text-right">
                      {language === "mn"
                        ? `${n.read_count}/${n.recipient_count} уншсан`
                        : `${n.read_count}/${n.recipient_count} read`}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewing(n)}
                      className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label={language === "mn" ? "Дэлгэрэнгүй" : "Details"}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(n)}
                      className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                      aria-label={language === "mn" ? "Устгах" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSent={(n) => setItems((prev) => [n, ...prev])}
        />
      )}
      {viewing && <SentDetailModal notification={viewing} onClose={() => setViewing(null)} />}
      {deleting && (
        <DeleteModal
          notification={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => setItems((prev) => prev.filter((n) => n.id !== deleting.id))}
        />
      )}
    </div>
  );
}

/* ───────────────────────── CEO / department admin: inbox ───────────────────────── */

function InboxView() {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();

  const [items, setItems] = useState<InboxNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [opened, setOpened] = useState<InboxNotification | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<{ notifications: InboxNotification[] }>(
        authorizedFetch,
        "/api/notifications",
      );
      setItems(data.notifications);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsLoading(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    load();
    // Sidebar шинэ мэдэгдэл ирснийг илрүүлбэл жагсаалтыг шууд шинэчилнэ.
    window.addEventListener(NOTIFICATIONS_ARRIVED_EVENT, load);
    return () => window.removeEventListener(NOTIFICATIONS_ARRIVED_EVENT, load);
  }, [load]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  async function handleOpen(n: InboxNotification) {
    setOpened(n);
    if (n.read_at) return;

    // Шууд уншсан болгож харуулна — алдаа гарвал буцаана.
    const optimisticReadAt = new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: optimisticReadAt } : x)));
    try {
      const data = await fetchJson<{ read_at: string }>(
        authorizedFetch,
        `/api/notifications/${n.id}/read`,
        { method: "POST" },
      );
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: data.read_at } : x)));
      emitNotificationsChanged();
    } catch (err) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: null } : x)));
      setActionError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    }
  }

  async function handleMarkAll() {
    setActionError(null);
    setIsMarkingAll(true);
    try {
      await fetchJson<{ updated: number }>(authorizedFetch, "/api/notifications/read-all", {
        method: "POST",
      });
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.read_at ? x : { ...x, read_at: now })));
      emitNotificationsChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="dash-card flex flex-wrap items-center justify-between gap-3 rounded-3xl px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <h1 className="font-serif text-xl text-white sm:text-2xl">
            {language === "mn" ? "Мэдэгдэл" : "Notifications"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {unreadCount > 0
              ? language === "mn"
                ? `${unreadCount} уншаагүй мэдэгдэл байна.`
                : `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
              : language === "mn"
                ? "Бүх мэдэгдлээ уншсан байна."
                : "You're all caught up."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || isMarkingAll}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-white/15 transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" />
          {language === "mn" ? "Бүгдийг уншсан болгох" : "Mark all as read"}
        </button>
      </div>

      {actionError && <ErrorBox message={actionError} />}

      <div className="dash-card overflow-hidden rounded-3xl">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
          </p>
        ) : loadError ? (
          <p className="px-4 py-8 text-center text-sm text-rose-300">{loadError}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Bell className="h-8 w-8 text-slate-500" />
            <p className="text-sm text-slate-400">
              {language === "mn" ? "Мэдэгдэл алга." : "No notifications yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((n) => {
              const unread = !n.read_at;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleOpen(n)}
                    className={`flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-white/5 ${
                      unread ? "bg-[#0071BB]/[0.07]" : ""
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        unread ? "bg-[#F48120]/15 text-[#F48120]" : "bg-white/5 text-slate-500"
                      }`}
                    >
                      {unread ? <Mail className="h-5 w-5" /> : <MailOpen className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${unread ? "font-semibold text-white" : "font-medium text-slate-300"}`}
                      >
                        {n.title}
                      </p>
                      <p className={`mt-0.5 line-clamp-2 text-xs ${unread ? "text-slate-300" : "text-slate-500"}`}>
                        {n.body}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                        {formatDateTime(n.created_at, language)}
                        {n.attachment_count > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            · <Paperclip className="h-3 w-3" /> {n.attachment_count}
                          </span>
                        )}
                      </p>
                    </div>
                    {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#F48120]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {opened && (
        <Modal
          title={opened.title}
          subtitle={formatDateTime(opened.created_at, language)}
          onClose={() => setOpened(null)}
          footer={
            <button
              type="button"
              onClick={() => setOpened(null)}
              className="w-full rounded-xl bg-[#0071BB] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0071BB]/25 sm:w-auto"
            >
              {language === "mn" ? "Хаах" : "Close"}
            </button>
          }
        >
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
            {opened.body}
          </div>
          {opened.attachment_count > 0 && <AttachmentList notificationId={opened.id} />}
        </Modal>
      )}
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function NotificationsPage() {
  const { user, isInitializing } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isInitializing && !user) router.replace("/login");
  }, [isInitializing, user, router]);

  if (isInitializing || !user) {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{language === "mn" ? "Ачааллаж байна…" : "Loading…"}</p>
      </div>
    );
  }

  return <DashboardShell>{user.role === "super_admin" ? <AdminView /> : <InboxView />}</DashboardShell>;
}