"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [sent,    setSent]    = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("Ingresa tu correo electrónico."); return; }

    setLoading(true);
    const supabase = createClient();

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetErr) {
      // Surface rate-limit errors; swallow "user not found" to avoid enumeration
      if (resetErr.message.toLowerCase().includes("rate limit") ||
          resetErr.message.toLowerCase().includes("too many")) {
        setError("Demasiados intentos. Espera un momento e intenta de nuevo.");
      } else {
        setSent(true); // Don't reveal whether the email exists
      }
    } else {
      setSent(true);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/login" className="inline-flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#00c85a] flex items-center justify-center">
            <span className="text-xl leading-none">🏆</span>
          </div>
          <span className="font-bold text-xl text-[#f1f5f9]">
            La <span className="text-[#00c85a]">Penúltima</span>
          </span>
        </Link>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Recuperar contraseña</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          Te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>

      {sent ? (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6 text-center space-y-4">
          <CheckCircle2 size={32} className="text-[#00c85a] mx-auto" />
          <div>
            <p className="text-sm font-bold text-[#f1f5f9] mb-1">Revisa tu correo</p>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Si existe una cuenta con ese correo, recibirás un enlace de recuperación en los próximos minutos.
            </p>
          </div>
          <Link
            href="/login"
            className="block text-sm text-[#00c85a] hover:text-[#00e87a] transition-colors"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tú@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
              required
              autoComplete="email"
              autoFocus
            />

            {error && (
              <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
                <p className="text-xs text-[#ef4444]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-14 px-8 bg-[#00c85a] text-[#0a0a12] text-base font-bold rounded-xl hover:bg-[#00e87a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando...</>
              ) : (
                "Enviar enlace de recuperación"
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/login" className="text-sm text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
