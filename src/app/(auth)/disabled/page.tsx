import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function DisabledPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="w-full max-w-sm animate-fade-in-up text-center">

      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-[#1e1e35] flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl">🔒</span>
      </div>

      {/* Message */}
      <h1 className="text-xl font-black text-[#f1f5f9] mb-2">
        Acceso revocado
      </h1>
      <p className="text-sm text-[#94a3b8] leading-relaxed mb-6">
        Un administrador ha deshabilitado tu cuenta.
        <br />
        No puedes acceder a Techtivo Pollita en este momento.
      </p>

      {/* Info card */}
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 text-left mb-5">
        <p className="text-xs text-[#64748b] leading-relaxed">
          Si crees que esto es un error, comunícate con el administrador
          de la liga para que reactive tu cuenta.
        </p>
      </div>

      {/* Actions — logout only */}
      <div className="flex flex-col items-center gap-3">
        {user && (
          <p className="text-[10px] text-[#64748b] font-mono">
            Conectado como {user.email}
          </p>
        )}
        <LogoutButton />
      </div>

    </div>
  );
}
