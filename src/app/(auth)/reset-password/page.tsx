"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/auth-errors";
import Input from "@/components/ui/Input";

type PageState = "loading" | "ready" | "success" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pageState,  setPageState]  = useState<PageState>("loading");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    // Supabase appends the recovery token as a URL hash:
    // /reset-password#access_token=...&type=recovery
    // The browser Supabase client picks this up automatically on
    // onAuthStateChange with event = "PASSWORD_RECOVERY".
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("ready");
      }
    });

    // If the user lands here without a valid recovery token the event
    // never fires — show an error after a short grace period.
    const timeout = setTimeout(() => {
      setPageState((s) => s === "loading" ? "invalid" : s);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pwdErr = validatePassword(password);
    if (pwdErr) { setError(pwdErr); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateErr) {
      setError(updateErr.message ?? "No se pudo actualizar la contraseña.");
    } else {
      setPageState("success");
      setTimeout(() => router.push("/login"), 2500);
    }
  }

  // ── Render states ─────────────────────────────────────────────────

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/login" className="inline-flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#00c85a] flex items-center justify-center">
            <span className="text-xl leading-none">🏆</span>
          </div>
          <span className="font-bold text-xl text-[#f1f5f9]">
            La <span className="text-[#00c85a]">Mundialista</span>
          </span>
        </Link>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Nueva contraseña</h1>
        <p className="text-sm text-[#94a3b8] mt-1">Elige una contraseña segura para tu cuenta.</p>
      </div>

      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6">

        {pageState === "loading" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Loader2 size={24} className="animate-spin text-[#00c85a]" />
            <p className="text-sm text-[#94a3b8]">Validando enlace de recuperación...</p>
          </div>
        )}

        {pageState === "invalid" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertCircle size={28} className="text-[#ef4444]" />
            <div>
              <p className="text-sm font-bold text-[#f1f5f9] mb-1">Enlace inválido o expirado</p>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                El enlace de recuperación ya no es válido. Solicita uno nuevo.
              </p>
            </div>
            <Link
              href="/forgot-password"
              className="mt-2 text-sm text-[#00c85a] hover:text-[#00e87a] transition-colors"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        )}

        {pageState === "success" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 size={32} className="text-[#00c85a]" />
            <div>
              <p className="text-sm font-bold text-[#f1f5f9] mb-1">¡Contraseña actualizada!</p>
              <p className="text-xs text-[#94a3b8]">
                Redirigiendo al inicio de sesión...
              </p>
            </div>
          </div>
        )}

        {pageState === "ready" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nueva contraseña"
              type="password"
              placeholder="Mín. 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              hint="Al menos 8 caracteres"
              required
              autoComplete="new-password"
              autoFocus
            />
            <Input
              label="Confirmar contraseña"
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

            <button
              type="submit"
              disabled={submitting}
              className="h-14 px-8 bg-[#00c85a] text-[#0a0a12] text-base font-bold rounded-xl hover:bg-[#00e87a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Guardando...</>
              ) : (
                "Guardar nueva contraseña"
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
