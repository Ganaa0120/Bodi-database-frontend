"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  X,
  ImagePlus,
  Loader2,
  Pencil,
  Trash2,
  Power,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Company } from "@/lib/types";
import { DashboardShell } from "../DashboardShell";

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * "create" горимд компани + CEO/admin login-ыг НЭГ дор үүсгэнэ.
 * "edit" горимд компанийн талбарууд + CEO/admin-ийн нэр/имэйл/нууц
 * үгийг ЗАСАХ боломжтой — нууц үгийн талбарыг хоосон орхивол
 * хэвээр үлдэнэ (шинэ утга бичсэн тохиолдолд л солино).
 */
function CompanyFormModal({
  mode,
  initialCompany,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initialCompany?: Company;
  onClose: () => void;
  onSaved: (company: Company) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();

  const [name, setName] = useState(initialCompany?.name ?? "");
  const [phone, setPhone] = useState(initialCompany?.phone ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(
    initialCompany?.logo_url ?? null,
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialCompany?.logo_url ?? null,
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [adminFullName, setAdminFullName] = useState(
    initialCompany?.admin_full_name ?? "",
  );
  const [adminEmail, setAdminEmail] = useState(
    initialCompany?.admin_email ?? "",
  );
  const [adminPassword, setAdminPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFormError(
        language === "mn"
          ? "Зөвхөн PNG, JPEG, WEBP зураг оруулна уу."
          : "Only PNG, JPEG, WEBP images are allowed.",
      );
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setFormError(
        language === "mn"
          ? "Зурагны хэмжээ 2MB-с бага байх ёстой."
          : "Image must be under 2MB.",
      );
      return;
    }

    setIsUploadingLogo(true);
    try {
      const urlRes = await authorizedFetch("/api/companies/logo-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || "Алдаа гарлаа.");

      const putRes = await fetch(urlData.uploadUrl, {
        method: "PUT",
        headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(
          language === "mn"
            ? "Зураг байршуулахад алдаа гарлаа."
            : "Failed to upload image.",
        );
      }

      setLogoUrl(urlData.publicUrl);
      setLogoPreview(URL.createObjectURL(file));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (name.trim().length < 2) {
      setFormError(
        language === "mn"
          ? "Компанийн нэр дор хаяж 2 тэмдэгттэй байх ёстой."
          : "Company name must be at least 2 characters.",
      );
      return;
    }
    if (phone.trim().length < 6) {
      setFormError(
        language === "mn"
          ? "Утасны дугаар оруулна уу."
          : "Please enter a phone number.",
      );
      return;
    }

    if (mode === "create") {
      if (adminFullName.trim().length < 2) {
        setFormError(
          language === "mn"
            ? "CEO/Админы нэрийг оруулна уу."
            : "Please enter the admin name.",
        );
        return;
      }
      if (!adminEmail.includes("@")) {
        setFormError(
          language === "mn"
            ? "Имэйл хаяг буруу байна."
            : "Invalid email address.",
        );
        return;
      }
      if (adminPassword.length < 10) {
        setFormError(
          language === "mn"
            ? "Нууц үг дор хаяж 10 тэмдэгттэй байх ёстой."
            : "Password must be at least 10 characters.",
        );
        return;
      }
    } else {
      // edit горимд: нэр/имэйл шаардлагатай (учир нь автоматаар бөглөгдсөн
      // байх ёстой), гэхдээ нууц үг зөвхөн БИЧСЭН тохиолдолд шалгана.
      if (adminFullName.trim().length < 2) {
        setFormError(
          language === "mn"
            ? "CEO/Админы нэрийг оруулна уу."
            : "Please enter the admin name.",
        );
        return;
      }
      if (!adminEmail.includes("@")) {
        setFormError(
          language === "mn"
            ? "Имэйл хаяг буруу байна."
            : "Invalid email address.",
        );
        return;
      }
      if (adminPassword.length > 0 && adminPassword.length < 10) {
        setFormError(
          language === "mn"
            ? "Шинэ нууц үг дор хаяж 10 тэмдэгттэй байх ёстой (эсвэл хоосон орхино)."
            : "New password must be at least 10 characters (or leave blank).",
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/companies"
          : `/api/companies/${initialCompany!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        logo_url: logoUrl,
        admin_full_name: adminFullName.trim(),
        admin_email: adminEmail.trim(),
      };
      // Нууц үгийг зөвхөн бичсэн үед л явуулна — хоосон орхивол backend
      // хуучин нууц үгийг хэвээр үлдээнэ.
      if (mode === "create" || adminPassword.length > 0) {
        payload.admin_password = adminPassword;
      }

      const res = await authorizedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");

      onSaved(data.company);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const title =
    mode === "create"
      ? language === "mn"
        ? "Шинэ компани нэмэх"
        : "Add new company"
      : language === "mn"
        ? "Компани засах"
        : "Edit company";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="dash-card relative w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
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

          <div className="flex items-center gap-4">
            <label
              htmlFor="logo-upload-input"
              className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/5 transition-colors hover:border-white/40"
            >
              {isUploadingLogo ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-5 w-5 text-slate-500" />
              )}
            </label>
            <input
              id="logo-upload-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoChange}
              disabled={isUploadingLogo || isSubmitting}
              className="hidden"
            />
            <div className="text-xs text-slate-400">
              <p className="font-semibold text-slate-300">
                {language === "mn" ? "Лого (заавал биш)" : "Logo (optional)"}
              </p>
              <p className="mt-0.5">
                PNG / JPEG / WEBP ·{" "}
                {language === "mn" ? "дээд тал нь 2MB" : "max 2MB"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Компанийн нэр" : "Company name"}
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                language === "mn"
                  ? "Жишээ нь: Bodi Properties"
                  : "e.g. Bodi Properties"
              }
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Утасны дугаар" : "Phone number"}
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
              placeholder="99112233"
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div className="h-px bg-white/10" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {language === "mn"
              ? "CEO / Компанийн админ нэвтрэх мэдээлэл"
              : "CEO / Company admin login"}
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Админы бүтэн нэр" : "Admin full name"}
            </label>
            <input
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                language === "mn" ? "Жишээ нь: Батбаяр Дорж" : "e.g. John Doe"
              }
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Админы имэйл" : "Admin email"}
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              disabled={isSubmitting}
              placeholder="ceo@company.mn"
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Админы нууц үг" : "Admin password"}
            </label>
            <input
              type="text"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                mode === "create"
                  ? language === "mn"
                    ? "Дор хаяж 10 тэмдэгт"
                    : "At least 10 characters"
                  : language === "mn"
                    ? "Хоосон орхивол хэвээр үлдэнэ"
                    : "Leave blank to keep unchanged"
              }
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {language === "mn" ? "Цуцлах" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingLogo}
              className="rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 transition-all disabled:opacity-50"
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

function DeleteConfirmModal({
  company,
  onClose,
  onConfirmed,
}: {
  company: Company;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await authorizedFetch(`/api/companies/${company.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Алдаа гарлаа.");
      }
      onConfirmed();
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
          {language === "mn" ? "Компанийг устгах уу?" : "Delete this company?"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {language === "mn"
            ? `"${company.name}" компанийг устгахад доторх бүх хэлтэс, хэрэглэгч мөн идэвхгүй болно. Энэ үйлдлийг буцаах боломжтой.`
            : `Deleting "${company.name}" will also deactivate its departments and users. Data is not permanently erased.`}
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

export default function CompaniesPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !user) {
      router.replace("/login");
    } else if (!isInitializing && user && user.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [isInitializing, user, router]);

  useEffect(() => {
    if (!user || user.role !== "super_admin") return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await authorizedFetch("/api/companies");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
        if (!cancelled) setCompanies(data.companies);
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

  async function handleToggleActive(company: Company) {
    setTogglingId(company.id);
    try {
      const res = await authorizedFetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !company.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? data.company : c)),
      );
    } catch {
      // товч дахин идэвхжинэ, харагдах алдаа шаардлагагүй жижиг үйлдэл
    } finally {
      setTogglingId(null);
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
              {language === "mn" ? "Компаниуд" : "Companies"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {language === "mn"
                ? "Bodi Group-ийн охин компаниудын жагсаалт."
                : "Bodi Group's subsidiary companies."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-linear-to-r from-bodi-blue to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-bodi-blue/25 transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            {language === "mn" ? "Компани нэмэх" : "Add company"}
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
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <Building2 className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">
                {language === "mn"
                  ? "Компани бүртгэгдээгүй байна. Дээрх товчоор эхнийхийг нэмнэ үү."
                  : "No companies yet. Add the first one above."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">
                    {language === "mn" ? "Нэр" : "Name"}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === "mn" ? "Утас" : "Phone"}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === "mn" ? "Төлөв" : "Status"}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === "mn" ? "Үүсгэсэн огноо" : "Created"}
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">
                    {language === "mn" ? "Үйлдэл" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-t border-white/5">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                          {company.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={company.logo_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                        <span className="font-medium text-white">
                          {company.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {company.phone || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(company)}
                        disabled={togglingId === company.id}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 ${
                          company.is_active
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-500/15 text-slate-400"
                        }`}
                        title={
                          language === "mn"
                            ? "Дарж төлөв солих"
                            : "Click to toggle"
                        }
                      >
                        <Power className="h-3 w-3" />
                        {company.is_active
                          ? language === "mn"
                            ? "Идэвхтэй"
                            : "Active"
                          : language === "mn"
                            ? "Идэвхгүй"
                            : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {new Date(company.created_at).toLocaleDateString(
                        language === "mn" ? "mn-MN" : "en-US",
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingCompany(company)}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                          aria-label={language === "mn" ? "Засах" : "Edit"}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCompany(company)}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                          aria-label={language === "mn" ? "Устгах" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {createOpen && (
        <CompanyFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={(c) => setCompanies((prev) => [c, ...prev])}
        />
      )}
      {editingCompany && (
        <CompanyFormModal
          mode="edit"
          initialCompany={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSaved={(updated) =>
            setCompanies((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c)),
            )
          }
        />
      )}
      {deletingCompany && (
        <DeleteConfirmModal
          company={deletingCompany}
          onClose={() => setDeletingCompany(null)}
          onConfirmed={() =>
            setCompanies((prev) =>
              prev.filter((c) => c.id !== deletingCompany.id),
            )
          }
        />
      )}
    </DashboardShell>
  );
}
