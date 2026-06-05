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
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#00c85a]/10 border border-[#00c85a]/20 text-[#00c85a] hover:bg-[#00c85a]/15 hover:border-[#00c85a]/35 transition-colors"
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
