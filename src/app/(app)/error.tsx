"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-xs">
        <AlertCircle size={40} className="text-[#ef4444] mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[#f1f5f9] mb-2">Algo salió mal</h2>
        <p className="text-sm text-[#64748b] mb-6">
          Hubo un problema al cargar esta página. Puede ser una conexión lenta o un
          error temporal.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#38BDF8] text-[#0a0a12] text-sm font-bold rounded-xl hover:bg-[#7DD3FC] transition-colors"
        >
          <RefreshCw size={14} />
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
