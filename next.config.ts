import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Access token нь браузерийн JS memory дотор л байх ёстой (localStorage-д
  // хадгалахгүй), гэхдээ энэ нь Next.js тохиргооны асуудал биш —
  // AuthContext дотор хэрэгжинэ (src/contexts/AuthContext.tsx харна уу).
};

export default nextConfig;
