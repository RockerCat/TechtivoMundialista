"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

// Replaces the root layout when an unrecoverable error occurs.
// Must define its own <html> and <body> tags.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error.message, error.digest);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-dvh bg-[#0a0a12] text-[#f1f5f9] flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <p className="text-4xl mb-4">⚽</p>
          <h2 className="text-lg font-bold text-[#f1f5f9] mb-2">Error inesperado</h2>
          <p className="text-sm text-[#64748b] mb-6">
            Algo falló al cargar Pollita. Por favor recarga la aplicación.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#38BDF8] text-[#0a0a12] text-sm font-bold rounded-xl hover:bg-[#7DD3FC] transition-colors"
          >
            <RefreshCw size={14} />
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
