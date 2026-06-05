"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import GroupModal from "./GroupModal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { joinGroupAction } from "@/app/actions/groups";
import type { GroupActionState } from "@/lib/groups";

interface JoinGroupModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill the code if the user arrived via an invite link */
  prefillCode?: string;
}

export default function JoinGroupModal({
  open,
  onClose,
  prefillCode,
}: JoinGroupModalProps) {
  const [state, formAction, isPending] = useActionState<GroupActionState, FormData>(
    joinGroupAction,
    null
  );

  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  return (
    <GroupModal open={open} onClose={onClose} title="Unirse a un grupo">
      {state && "success" in state ? (
        <JoinSuccessView groupName={state.group.name} onClose={onClose} />
      ) : (
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <p className="text-sm text-[#94a3b8]">
            Ingresa el código que te compartió el organizador del grupo.
          </p>

          <Input
            label="Código de invitación"
            name="invite_code"
            type="text"
            placeholder="ej. VAR26X"
            defaultValue={prefillCode}
            required
            minLength={4}
            maxLength={8}
            className="uppercase tracking-widest text-center font-mono text-lg"
            autoFocus
            autoCapitalize="characters"
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
            Unirme al grupo
          </Button>
        </form>
      )}
    </GroupModal>
  );
}

function JoinSuccessView({
  groupName,
  onClose,
}: {
  groupName: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#38BDF8]/15 flex items-center justify-center">
          <CheckCircle2 size={26} className="text-[#38BDF8]" />
        </div>
        <div>
          <h3 className="text-base font-black text-[#f1f5f9]">
            ¡Te uniste al grupo!
          </h3>
          <p className="text-sm text-[#94a3b8] mt-0.5">{groupName}</p>
        </div>
      </div>

      <p className="text-xs text-[#64748b]">
        Ya puedes ver los partidos y empezar a predecir los marcadores.
      </p>

      <Button variant="secondary" fullWidth onClick={onClose}>
        Ir al dashboard
      </Button>
    </div>
  );
}
