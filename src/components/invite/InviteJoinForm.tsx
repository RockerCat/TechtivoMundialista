"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { joinGroupAction } from "@/app/actions/groups";
import type { GroupActionState } from "@/lib/groups";

interface InviteJoinFormProps {
  inviteCode: string;
}

export default function InviteJoinForm({ inviteCode }: InviteJoinFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<GroupActionState, FormData>(
    joinGroupAction,
    null
  );

  // Redirect to dashboard after a successful join
  useEffect(() => {
    if (state && "success" in state) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3 w-full">
      <input type="hidden" name="invite_code" value={inviteCode} />

      <Button type="submit" size="lg" fullWidth loading={isPending}>
        Unirme al grupo
      </Button>

      {state && "error" in state && (
        <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
          <p className="text-xs text-[#ef4444]">{state.error}</p>
        </div>
      )}
    </form>
  );
}
