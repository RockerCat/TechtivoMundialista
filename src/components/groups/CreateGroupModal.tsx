"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, Copy, Check } from "lucide-react";
import { SoccerBallIcon } from "@/components/ui/SoccerBallIcon";
import { useState } from "react";
import GroupModal from "./GroupModal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createGroupAction } from "@/app/actions/groups";
import type { GroupActionState } from "@/lib/groups";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const [state, formAction, isPending] = useActionState<GroupActionState, FormData>(
    createGroupAction,
    null
  );

  // Reset form state when modal closes
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
    }
  }, [open]);

  return (
    <GroupModal
      open={open}
      onClose={onClose}
      title="Crear grupo"
    >
      {state && "success" in state ? (
        <SuccessView
          groupName={state.group.name}
          inviteCode={state.group.invite_code}
          onClose={onClose}
        />
      ) : (
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <p className="text-sm text-[#94a3b8]">
            Dale un nombre a tu grupo y comparte el código de invitación.
          </p>

          <Input
            label="Nombre del grupo"
            name="name"
            type="text"
            placeholder="ej. La Banda del Mundial"
            required
            minLength={2}
            maxLength={50}
            autoFocus
          />

          {state && "error" in state && (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
                <p className="text-xs text-[#ef4444]">{state.error}</p>
              </div>
              {state.devMessage && (
                <div className="bg-[#0a0a12] border border-[#f59e0b]/30 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-[#f59e0b] font-mono uppercase tracking-widest mb-1">
                    🔧 Error de desarrollo
                  </p>
                  <pre className="text-[10px] text-[#94a3b8] font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {state.devMessage}
                  </pre>
                </div>
              )}
            </div>
          )}

          <Button type="submit" fullWidth loading={isPending} size="lg">
            Crear grupo
          </Button>
        </form>
      )}
    </GroupModal>
  );
}

function SuccessView({
  groupName,
  inviteCode,
  onClose,
}: {
  groupName: string;
  inviteCode: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex flex-col gap-5 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#38BDF8]/15 flex items-center justify-center">
          <SoccerBallIcon size={26} className="text-[#38BDF8]" />
        </div>
        <div>
          <h3 className="text-base font-black text-[#f1f5f9]">
            ¡Grupo creado!
          </h3>
          <p className="text-sm text-[#94a3b8] mt-0.5">{groupName}</p>
        </div>
      </div>

      {/* Invite code highlight */}
      <div className="bg-[#0a0a12] border border-[#2a2a45] rounded-2xl p-4">
        <p className="text-xs text-[#64748b] mb-2">
          Comparte este código:
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-2xl font-black font-mono tracking-[0.2em] text-[#f1f5f9]">
            {inviteCode}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#18182a] border border-[#2a2a45] hover:border-[#38BDF8]/40 hover:text-[#38BDF8] text-xs font-semibold text-[#94a3b8] transition-colors"
          >
            {copied ? (
              <><Check size={13} className="text-[#38BDF8]" /><span className="text-[#38BDF8]">Copiado</span></>
            ) : (
              <><Copy size={13} /><span>Copiar</span></>
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-[#64748b]">
        Pueden unirse desde la pantalla de registro o desde el
        dashboard con este código.
      </p>

      <Button variant="secondary" fullWidth onClick={onClose}>
        Ir al dashboard
      </Button>
    </div>
  );
}
