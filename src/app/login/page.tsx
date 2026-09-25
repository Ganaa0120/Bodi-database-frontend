import { LoginPageClient } from './LoginPageClient';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.next && params.next.startsWith('/') ? params.next : '/dashboard';

  return <LoginPageClient redirectTo={redirectTo} />;
}
