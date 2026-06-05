import LoginForm from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ invite?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <LoginForm inviteCode={params.invite ?? null} />;
}
