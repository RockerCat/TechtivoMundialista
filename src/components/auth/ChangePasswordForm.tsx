"use client";

import { useState } from "react";
import { Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/auth-errors";
import Input from "@/components/ui/Input";

export default function ChangePasswordForm() {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const pwdErr = validatePassword(next);
    if (pwdErr) { setError(pwdErr); return; }
    if (next !== confirm) { setError("Las contraseñas no coinciden."); return; }
    if (!current)         { setError("Ingresa tu contraseña actual."); return; }

    setLoading(true);
    const supabase = createClient();

    // Re-authenticate with current password to verify identity before changing.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setError("No se pudo verificar tu cuenta."); setLoading(false); return; }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email:    user.email,
      password: current,
    });
    if (signInErr) {
      setError("La contraseña actual es incorrecta.");
      setLoading(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    setLoading(false);

    if (updateErr) {
      setError(updateErr.message ?? "No se pudo actualizar la contraseña.");
    } else {
      setSuccess(true);
      setCurrent(""); setNext(""); setConfirm("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Contraseña actual"
        type="password"
        placeholder="••••••••"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        leftIcon={<Lock size={16} />}
        required
        autoComplete="current-password"
      />
      <Input
        label="Nueva contraseña"
        type="password"
        placeholder="Mín. 8 caracteres"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        leftIcon={<Lock size={16} />}
        hint="Al menos 8 caracteres"
        required
        autoComplete="new-password"
      />
      <Input
        label="Confirmar nueva contraseña"
        type="password"
        placeholder="••••••••"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        leftIcon={<Lock size={16} />}
        required
        autoComplete="new-password"
      />

      {error && (
        <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
          <p className="text-xs text-[#ef4444]">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 bg-[#38BDF8]/8 border border-[#38BDF8]/20 rounded-xl px-3 py-2.5">
          <CheckCircle2 size={14} className="text-[#38BDF8] mt-0.5 shrink-0" />
          <p className="text-xs text-[#38BDF8]">Contraseña actualizada correctamente.</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-11 px-6 bg-[#38BDF8] text-[#0a0a12] text-sm font-bold rounded-xl hover:bg-[#7DD3FC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Actualizando...</>
        ) : (
          "Actualizar contraseña"
        )}
      </button>
    </form>
  );
}
