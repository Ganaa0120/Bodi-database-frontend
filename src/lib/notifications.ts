/**
 * Системийн мэдэгдэл — frontend-д хуваалцах type, тогтмол утга.
 */

/** Мэдэгдэл уншсан/илгээсэн үед sidebar badge-ийг шууд шинэчлэх event. */
export const NOTIFICATIONS_CHANGED_EVENT = "bodi:notifications-changed";

export function emitNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

/**
 * Sidebar уншаагүй тоо НЭМЭГДСЭНИЙГ (шинэ мэдэгдэл ирснийг) илрүүлэхэд
 * дуудагдана — мэдэгдлийн хуудас нээлттэй бол жагсаалтаа дахин ачаална.
 */
export const NOTIFICATIONS_ARRIVED_EVENT = "bodi:notifications-arrived";

export function emitNotificationsArrived() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_ARRIVED_EVENT));
  }
}

/** Уншаагүй тоог шалгах давтамж (ms). Tab нуугдсан үед шалгахгүй. */
export const UNREAD_POLL_INTERVAL_MS = 15000;

export type NotificationTarget = "all" | "selected";
export type RecipientRole = "company" | "department";

/** CEO / department admin-ы inbox-ийн мөр. */
export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  attachment_count: number;
}

/** Super admin-ы илгээсэн мэдэгдэл + статистик. */
export interface SentNotification {
  id: string;
  title: string;
  body: string;
  target_type: NotificationTarget;
  created_at: string;
  recipient_count: number;
  read_count: number;
  attachment_count: number;
  send_email: boolean;
  email_sent_count: number;
  email_pending_count: number;
  email_failed_count: number;
}

export type EmailStatus = "not_requested" | "pending" | "sending" | "sent" | "failed" | "skipped";

/** Хүлээн авагч сонгох жагсаалтын мөр. */
export interface RecipientOption {
  id: string;
  full_name: string;
  email: string;
  role: RecipientRole;
  company_id: string;
  company_name: string;
  department_id: string | null;
  department_name: string | null;
}

/** Нэг мэдэгдлийн хүлээн авагч бүрийн уншсан эсэх. */
export interface RecipientStatus {
  user_id: string;
  read_at: string | null;
  email_status: EmailStatus;
  email_sent_at: string | null;
  full_name: string;
  email: string;
  role: RecipientRole;
  company_name: string | null;
  department_name: string | null;
}

export function formatDateTime(value: string, language: string): string {
  return new Date(value).toLocaleString(language === "mn" ? "mn-MN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ───────────── Хавсралт ───────────── */

export interface NotificationAttachment {
  id: string;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  /** 15 минутын хугацаатай read link */
  url: string;
}

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

/** Backend-ийн зөвшөөрдөг төрлүүд. SVG санаатайгаар ороогүй. */
const EXTENSION_TO_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ALLOWED_TYPES = new Set(Object.values(EXTENSION_TO_TYPE));

export const ATTACHMENT_ACCEPT = Object.keys(EXTENSION_TO_TYPE)
  .map((ext) => `.${ext}`)
  .join(",");

/**
 * Файлын жинхэнэ MIME төрлийг тодорхойлно. Windows дээр Office файлын
 * file.type заримдаа хоосон ирдэг тул өргөтгөлөөр нөхнө.
 * Зөвшөөрөгдөөгүй бол null.
 */
export function resolveAttachmentType(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_TYPE[ext] ?? null;
}

export function isImageType(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}