/**
 * Системийн заавар (PDF) — frontend-д хуваалцах type, тогтмол утга, helper.
 */

// Backend-ийн users.role утгуудтай (company, department) таарна.
export type GuideAudience = 'company' | 'department';

export const GUIDE_AUDIENCES: { value: GuideAudience; mn: string; en: string }[] = [
  { value: 'company', mn: 'CEO / Компанийн админ', en: 'CEO / Company admin' },
  { value: 'department', mn: 'Хэлтсийн админ', en: 'Department admin' },
];

export interface SystemGuide {
  id: string;
  title: string;
  description: string | null;
  file_size_bytes: number;
  audience: GuideAudience[];
  is_active: boolean;
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export const MAX_GUIDE_SIZE = 20 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Lossless оновчлол — зураг, текстийн чанарт огт хүрэхгүй, зөвхөн PDF-ийн
 * дотоод бүтцийг (object streams) шахна. Browser дээр ажилладаг тул
 * серверт ачаалал өгөхгүй.
 *
 * Жижгэрээгүй, эсвэл уншиж чадаагүй (нууцлалтай PDF гэх мэт) бол эх
 * файлыг хэвээр буцаана.
 */
export async function optimizePdf(file: File): Promise<File> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    const out = await doc.save({ useObjectStreams: true });
    if (out.byteLength < file.size) {
      return new File([out as unknown as BlobPart], file.name, { type: 'application/pdf' });
    }
  } catch {
    // оновчилж чадаагүй — эх файлаар үргэлжлүүлнэ
  }
  return file;
}