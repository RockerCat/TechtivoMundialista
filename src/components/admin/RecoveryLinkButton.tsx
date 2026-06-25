"use client";

import { useActionState, useState } from "react";
import { KeyRound, X, Copy, Check, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { generateRecoveryLinkAction, type GenerateRecoveryLinkState } from "@/app/actions/admin";

export default function RecoveryLinkButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  // Bumped every time the modal opens so the inner component remounts and
  // useActionState starts from a clean slate (no stale link/error shown).
  const [generation, setGeneration] = useState(0);

  return (
    <>
      <button
        type="button"
        title="Generar enlace de recuperación"
        onClick={() => {
          setGeneration((g) => g + 1);
          setOpen(true);
        }}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#38BDF8]/25 text-[#38BDF8] bg-[#38BDF8]/8 hover:bg-[#38BDF8]/15 transition-colors"
      >
        <KeyRound size={12} />
      </button>

      {open && (
        <RecoveryLinkModal
          key={generation}
          userId={userId}
          userName={userName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function RecoveryLinkModal({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<GenerateRecoveryLinkState, FormData>(
    generateRecoveryLinkAction,
    null
  );
  const [copied, setCopied] = useState(false);

  const success = state && "success" in state ? state : null;
  const error   = state && "error"   in state ? state.error : null;

  async function handleCopy() {
    if (!success) return;
    await navigator.clipboard.writeText(success.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet / modal */}
      <div className="relative z-10 w-full bg-[#11111c] border border-[#2a2a45] rounded-t-3xl sm:rounded-2xl sm:max-w-md sm:mx-4 animate-fade-in-up">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#2a2a45]" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e35]">
          <h2 className="text-base font-bold text-[#f1f5f9]">Enlace de recuperación</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#20203a] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          {success ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[#94a3b8]">
                Generado para <strong className="text-[#f1f5f9]">{userName}</strong> ({success.email}).
              </p>

              <div className="bg-[#0a0a12] border border-[#2a2a45] rounded-xl p-3">
                <p className="text-xs text-[#f1f5f9] break-all font-mono">{success.link}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 h-11 rounded-xl bg-[#38BDF8] text-[#0a0a12] text-sm font-bold hover:bg-[#7DD3FC] transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <><Check size={14} /> Copiado</>
                  ) : (
                    <><Copy size={14} /> Copiar</>
                  )}
                </button>
                <a
                  href={success.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 px-4 rounded-xl border border-[#2a2a45] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#3b3b60] text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={14} /> Abrir
                </a>
              </div>

              <p className="text-[11px] text-[#64748b] leading-relaxed">
                Este enlace es de un solo uso y expira automáticamente según las políticas de seguridad de Supabase.
                Envíaselo manualmente al usuario (WhatsApp, correo, etc.). No queda guardado en ningún lugar después de cerrar esta ventana.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-[#2a2a45] text-[#94a3b8] hover:text-[#f1f5f9] text-sm font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="user_id" value={userId} />
              <input type="hidden" name="user_name" value={userName} />

              <p className="text-sm text-[#94a3b8]">
                Se generará un enlace de recuperación de contraseña para{" "}
                <strong className="text-[#f1f5f9]">{userName}</strong> usando la API oficial de Supabase.
                Tendrás que copiarlo y enviarlo manualmente al usuario.
              </p>

              {error && (
                <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#ef4444]">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl border border-[#2a2a45] text-[#94a3b8] hover:text-[#f1f5f9] text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 h-11 rounded-xl bg-[#38BDF8] text-[#0a0a12] text-sm font-bold hover:bg-[#7DD3FC] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : "Generar enlace"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
