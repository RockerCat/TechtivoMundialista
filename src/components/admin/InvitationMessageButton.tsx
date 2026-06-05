"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function InvitationMessageButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/invite/${inviteCode}`;
    const message = [
      "🏆 Te invito a participar en Techtivo Mundialista.",
      "",
      "Haz tus pronósticos del Mundial y compite por el primer lugar.",
      "",
      "Únete aquí:",
      url,
      "",
      `Código: ${inviteCode}`,
    ].join("\n");

    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#18182a] border border-[#2a2a45] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#3b3b60] transition-colors"
    >
      {copied ? (
        <><Check size={12} className="text-[#00c85a]" /><span className="text-[#00c85a]">¡Copiado!</span></>
      ) : (
        <><Copy size={12} />Copiar mensaje</>
      )}
    </button>
  );
}
