"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hash, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function normalise(raw: string) {
    return raw.trim().toUpperCase();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const upper = normalise(code);
    if (!upper) {
      setError("Ingresa el código de invitación.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Validate the code exists before redirecting — same RPC used by /invite/[code].
    const { data: groups, error: rpcErr } = await supabase.rpc(
      "get_group_by_invite_code",
      { code: upper }
    );

    setLoading(false);

    if (rpcErr || !groups || (groups as unknown[]).length === 0) {
      setError("El código de invitación no es válido.");
      inputRef.current?.select();
      return;
    }

    // Hand off to the existing invite page — it owns all join logic.
    router.push(`/invite/${upper}`);
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
        <h1 className="text-2xl font-black text-[#f1f5f9]">Únete al grupo</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          Ingresa el código que te compartió el administrador.
        </p>
      </div>

      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Code input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#94a3b8]">
              Código de invitación
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b]">
                <Hash size={16} />
              </span>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="XXXXXX"
                maxLength={10}
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                autoFocus
                className="w-full h-12 rounded-xl bg-[#18182a] border border-[#2a2a45] text-[#f1f5f9] pl-10 pr-4 text-sm font-mono tracking-[0.25em] uppercase placeholder:text-[#64748b] placeholder:tracking-normal focus:outline-none focus:border-[#00c85a]/60 focus:ring-4 focus:ring-[#00c85a]/10 transition-colors"
              />
            </div>
            <p className="text-xs text-[#64748b]">
              Solicita el código al administrador del grupo.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
              <p className="text-xs text-[#ef4444]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="h-14 px-8 bg-[#00c85a] text-[#0a0a12] text-base font-bold rounded-xl hover:bg-[#00e87a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Verificando...</>
            ) : (
              "Continuar"
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#1e1e35] text-center">
          <p className="text-sm text-[#94a3b8]">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-[#00c85a] font-semibold hover:text-[#00e87a]">
              Ingresar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
