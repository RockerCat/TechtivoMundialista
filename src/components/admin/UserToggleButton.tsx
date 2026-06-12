"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toggleUserStatusAction, type ToggleUserState } from "@/app/actions/admin";

export default function UserToggleButton({
  userId,
  userName,
  isDisabled,
}: {
  userId: string;
  userName: string;
  isDisabled: boolean;
}) {
  const [state, formAction, pending] =
    useActionState<ToggleUserState, FormData>(toggleUserStatusAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="user_id"   value={userId} />
      <input type="hidden" name="user_name" value={userName} />
      <input type="hidden" name="action"    value={isDisabled ? "enable" : "disable"} />
      <button
        type="submit"
        disabled={pending}
        className={
          isDisabled
            ? "text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#38BDF8]/30 text-[#38BDF8] bg-[#38BDF8]/8 hover:bg-[#38BDF8]/15 disabled:opacity-40 transition-colors"
            : "text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#ef4444]/25 text-[#ef4444] bg-[#ef4444]/8 hover:bg-[#ef4444]/15 disabled:opacity-40 transition-colors"
        }
      >
        {pending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : isDisabled ? (
          "Habilitar"
        ) : (
          "Deshabilitar"
        )}
      </button>
      {state && "error" in state && (
        <p className="text-[10px] text-[#ef4444] mt-1">{state.error}</p>
      )}
    </form>
  );
}
