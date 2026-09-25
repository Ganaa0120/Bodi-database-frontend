import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060a17] px-6">
      <div className="glass-panel w-full max-w-sm rounded-2xl p-8 text-center text-white">
        <ShieldAlert className="mx-auto mb-4 h-8 w-8 text-blue-400" />
        <h1 className="text-lg font-bold">Нууц үг сэргээх функц тун удахгүй</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Аюулгүй байдлын үүднээс нууц үг сэргээх боломж одоогоор хараахан идэвхжээгүй байна.
          Одоохондоо системийн администратортай шууд холбогдож, нууц үгээ шинэчлүүлнэ үү.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block w-full rounded-xl bg-gradient-to-r from-[#0072ce] via-blue-600 to-indigo-700 py-3 text-sm font-bold text-white transition-all hover:from-[#0060ad] hover:to-indigo-600"
        >
          Нэвтрэх хуудас руу буцах
        </Link>
      </div>
    </div>
  );
}
