import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function NoAccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="w-full max-w-sm animate-fade-in-up text-center">

      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-[#1e1e35] flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl">⛔</span>
      </div>

      {/* Message */}
      <h1 className="text-xl font-black text-[#f1f5f9] mb-2">
        No perteneces a ningún grupo
      </h1>
      <p className="text-sm text-[#94a3b8] leading-relaxed mb-6">
        La Penúltima es una liga privada.
        <br />
        Solicita una invitación al administrador para participar.
      </p>

      {/* Info card */}
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 text-left mb-5">
        <p className="text-xs text-[#64748b] leading-relaxed">
          Si recibiste un enlace de invitación, úsalo directamente.
          El enlace tiene la forma{" "}
          <span className="font-mono text-[#94a3b8]">/invite/CÓDIGO</span>{" "}
          y te agrega automáticamente al grupo.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {user ? (
          <>
            <p className="text-[10px] text-[#64748b] font-mono">
              Conectado como {user.email}
            </p>
            <LogoutButton />
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center h-11 w-full bg-[#18182a] text-[#94a3b8] text-sm font-medium rounded-xl border border-[#2a2a45] hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors"
          >
            Cambiar de cuenta
          </Link>
        )}
      </div>

    </div>
  );
}
