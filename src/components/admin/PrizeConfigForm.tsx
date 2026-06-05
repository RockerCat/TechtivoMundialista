"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { updateGroupPrizeAction, type UpdatePrizeState } from "@/app/actions/admin";

interface PrizeConfigFormProps {
  groupId:         string;
  entryFee:        number;
  firstPlacePct:   number;
  secondPlacePct:  number;
}

export default function PrizeConfigForm({
  groupId,
  entryFee,
  firstPlacePct,
  secondPlacePct,
}: PrizeConfigFormProps) {
  const [state, action, isPending] = useActionState<UpdatePrizeState, FormData>(
    updateGroupPrizeAction,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="group_id" value={groupId} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Inscripción (COP)" name="entry_fee" defaultValue={entryFee} min={0} hint="Ej: 20000" />
        <Field label="1er lugar (%)" name="first_place_pct" defaultValue={firstPlacePct} min={0} max={100} hint="Ej: 70" />
        <Field label="2do lugar (%)" name="second_place_pct" defaultValue={secondPlacePct} min={0} max={100} hint="Ej: 30" />
      </div>

      <p className="text-[10px] text-[#64748b]">
        Los porcentajes deben sumar 100. Si la inscripción es 0, la bolsa se oculta.
      </p>

      {state && "error" in state && (
        <div className="flex items-center gap-2 text-xs text-[#ef4444]">
          <AlertCircle size={12} className="shrink-0" />
          {state.error}
        </div>
      )}
      {state && "success" in state && (
        <div className="flex items-center gap-2 text-xs text-[#00c85a]">
          <Check size={12} className="shrink-0" />
          Guardado correctamente
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start h-9 px-4 bg-[#00c85a] text-[#0a0a12] text-xs font-bold rounded-xl hover:bg-[#00e87a] disabled:opacity-40 transition-colors flex items-center gap-2"
      >
        {isPending ? <><Loader2 size={12} className="animate-spin" />Guardando...</> : "Guardar configuración"}
      </button>
    </form>
  );
}

function Field({
  label, name, defaultValue, min, max, hint,
}: {
  label: string; name: string; defaultValue: number; min?: number; max?: number; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest">
        {label}
      </label>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        min={min}
        max={max}
        required
        className="h-10 rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 focus:outline-none focus:border-[#00c85a]/60 focus:ring-2 focus:ring-[#00c85a]/10 transition-colors tabular-nums"
      />
      {hint && <p className="text-[9px] text-[#475569]">{hint}</p>}
    </div>
  );
}
