"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validatePassword, getAuthErrorMessage } from "@/lib/auth-errors";
import Input from "@/components/ui/Input";
import TechtivoWordmark from "@/components/ui/TechtivoWordmark";

type PageState = "loading" | "ready" | "success" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pageState,  setPageState]  = useState<PageState>("loading");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Guards against React Strict Mode's double-invoke in dev, which would
  // otherwise consume a single-use code/token twice.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const supabase = createClient();

    function clearUrl() {
      window.history.replaceState(null, "", window.location.pathname);
    }

    async function resolveSession() {
      // 1. Implicit/hash flow — Supabase recovery tokens delivered as a URL
      //    fragment (#access_token=...&refresh_token=...&type=recovery).
      //    The fragment never reaches the server, so it must be read here.
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashAccessToken  = hashParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token");

      if (hashParams.get("type") === "recovery" && hashAccessToken && hashRefreshToken) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token:  hashAccessToken,
          refresh_token: hashRefreshToken,
        });
        clearUrl();
        setPageState(setErr ? "invalid" : "ready");
        return;
      }

      const params = new URLSearchParams(window.location.search);

      // 2. PKCE code flow — self-service "forgot password" links.
      const code = params.get("code");
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        clearUrl();
        setPageState(exchangeErr ? "invalid" : "ready");
        return;
      }

      // 3. Branded token_hash flow — admin-generated recovery links.
      const tokenHash = params.get("token_hash");
      if (tokenHash && params.get("type") === "recovery") {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type:       "recovery",
        });
        clearUrl();
        setPageState(verifyErr ? "invalid" : "ready");
        return;
      }

      // 4. Explicit error forwarded by a legacy /auth/callback redirect.
      if (params.get("error")) {
        setPageState("invalid");
        return;
      }

      // 5. Legacy fallback — session already established server-side by an
      //    older /auth/callback link that redirected here with no params.
      const { data: { session } } = await supabase.auth.getSession();
      setPageState(session ? "ready" : "invalid");
    }

    resolveSession();
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
      setError(getAuthErrorMessage(updateErr));
    } else {
      setPageState("success");
      setTimeout(() => router.push("/login"), 2500);
    }
  }

  // ── Render states ──────────────────────────────────────────────────

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/login" className="inline-flex mb-6">
          <TechtivoWordmark width={140} height={30} subtitleClassName="text-xs" />
        </Link>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Nueva contraseña</h1>
        <p className="text-sm text-[#94a3b8] mt-1">Elige una contraseña segura para tu cuenta.</p>
      </div>

      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6">

        {pageState === "loading" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Loader2 size={24} className="animate-spin text-[#38BDF8]" />
            <p className="text-sm text-[#94a3b8]">Verificando sesión...</p>
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
              className="mt-2 text-sm text-[#38BDF8] hover:text-[#7DD3FC] transition-colors"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        )}

        {pageState === "success" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 size={32} className="text-[#38BDF8]" />
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
              className="h-14 px-8 bg-[#38BDF8] text-[#0a0a12] text-base font-bold rounded-xl hover:bg-[#7DD3FC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
