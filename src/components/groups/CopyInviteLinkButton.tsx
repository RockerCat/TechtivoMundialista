"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export default function CopyInviteLinkButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/invite/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copiar enlace de invitación"
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[#38BDF8] hover:bg-[#38BDF8]/15 hover:border-[#38BDF8]/35 transition-colors"
    >
      {copied ? (
        <>
          <Check size={12} />
          <span>¡Copiado!</span>
        </>
      ) : (
        <>
          <Link2 size={12} />
          <span>Copiar link</span>
        </>
      )}
    </button>
  );
}
