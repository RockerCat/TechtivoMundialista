"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copiar código"
      className="flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-[#20203a] border border-[#2a2a45] hover:border-[#38BDF8]/40 hover:text-[#38BDF8] transition-colors"
    >
      {copied ? (
        <>
          <Check size={12} className="text-[#38BDF8]" />
          <span className="text-[#38BDF8]">Copiado</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span className="text-[#94a3b8]">{text}</span>
        </>
      )}
    </button>
  );
}
