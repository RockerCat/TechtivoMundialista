"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getAdminSnapshotAction } from "@/app/actions/admin";

export default function SnapshotDownloadButton() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await getAdminSnapshotAction();

    if (!result || "error" in result) {
      setError(result?.error ?? "No se pudo generar el snapshot.");
      setLoading(false);
      return;
    }

    const blob = new Blob([JSON.stringify(result.snapshot, null, 2)], {
      type: "application/json",
    });
    const url   = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const a     = document.createElement("a");
    a.href = url;
    a.download = `pollita-techtivo-snapshot-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLoading(false);
    setSuccess(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 h-11 px-6 bg-[#18182a] border border-[#2a2a45] text-[#94a3b8] text-sm font-semibold rounded-xl hover:border-[#38BDF8]/40 hover:text-[#38BDF8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" /> Generando snapshot...</>
        ) : (
          <><Download size={15} /> Descargar snapshot JSON</>
        )}
      </button>

      {success && (
        <div className="flex items-start gap-2 bg-[#38BDF8]/8 border border-[#38BDF8]/20 rounded-xl px-3 py-2.5">
          <CheckCircle2 size={14} className="text-[#38BDF8] mt-0.5 shrink-0" />
          <p className="text-xs text-[#38BDF8]">Snapshot descargado correctamente.</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
          <p className="text-xs text-[#ef4444]">{error}</p>
        </div>
      )}
    </div>
  );
}
