import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";

interface SignupPageProps {
  searchParams: Promise<{ invite?: string; group?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const inviteCode = params.invite ?? null;
  const groupName  = params.group  ?? null;

  // Direct access without an invite code is not allowed.
  // Users must arrive via /invite/:code which sets the ?invite= param.
  if (!inviteCode) {
    return (
      <div className="w-full max-w-sm animate-fade-in-up text-center">
        <div className="mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1e1e35] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-xl font-black text-[#f1f5f9] mb-2">
            Acceso solo por invitación
          </h1>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            Techtivo Mundialista es un grupo privado.
            <br />
            Solicita el enlace de invitación al administrador.
          </p>
        </div>

        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 text-left mb-4">
          <p className="text-xs text-[#64748b] leading-relaxed">
            Si ya tienes una cuenta,{" "}
            <Link href="/login" className="text-[#00c85a] font-semibold hover:text-[#00e87a]">
              inicia sesión aquí
            </Link>
            . Si recibiste un enlace de invitación, úsalo directamente.
          </p>
        </div>
      </div>
    );
  }

  return <SignupForm inviteCode={inviteCode} groupName={groupName} />;
}
