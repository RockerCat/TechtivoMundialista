"use client";

import { useActionState } from "react";
import { Loader2, RefreshCw, Check, AlertCircle } from "lucide-react";
import { recalculateAllScoresAction, type RecalculateState } from "@/app/actions/admin";

export default function RecalculateButton() {
  const [state, formAction, pending] =
    useActionState<RecalculateState, FormData>(recalculateAllScoresAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 h-9 px-4 bg-[#18182a] border border-[#2a2a45] text-[#94a3b8] text-xs font-semibold rounded-xl hover:border-[#00c85a]/40 hover:text-[#00c85a] disabled:opacity-40 transition-colors"
      >
        {pending ? (
          <><Loader2 size={13} className="animate-spin" />Recalculando...</>
        ) : (
          <><RefreshCw size={13} />Recalcular puntuaciones</>
        )}
      </button>

      {state && "success" in state && (
        <p className="flex items-center gap-1.5 text-xs text-[#00c85a]">
          <Check size={11} />
          Recalculado · {state.matches_processed} partidos · {state.predictions_scored} predicciones
        </p>
      )}
      {state && "error" in state && (
        <p className="flex items-center gap-1.5 text-xs text-[#ef4444]">
          <AlertCircle size={11} />
          {state.error}
        </p>
      )}
    </form>
  );
}
