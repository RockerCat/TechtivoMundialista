"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { IosInstallModal } from "@/components/auth/InstallAppButton";

const DISMISS_KEY = "pollita_pwa_install_banner_dismissed";

export default function PwaInstallBanner() {
  const { shouldShowButton, canPromptAndroid, canShowIosInstructions, promptAndroidInstall } =
    usePwaInstall();
  // Lazy init reads localStorage on the client's first mount — same SSR-safe
  // pattern as usePwaInstall, avoids a flash of the banner before dismissal
  // state is known.
  const [dismissed, setDismissed] = useState(() =>
    typeof window === "undefined" ? false : localStorage.getItem(DISMISS_KEY) === "1"
  );
  const [showIosModal, setShowIosModal] = useState(false);

  if (!shouldShowButton || dismissed) return null;

  function handleAction() {
    if (canPromptAndroid) {
      promptAndroidInstall();
    } else if (canShowIosInstructions) {
      setShowIosModal(true);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  return (
    <>
      <div className="mb-3 h-11 flex items-center gap-2 px-3 bg-[#38BDF8]/8 border border-[#38BDF8]/20 rounded-xl">
        <p className="flex-1 min-w-0 text-xs font-semibold text-[#f1f5f9] truncate">
          {canShowIosInstructions ? "📲 Agrega Pollita al inicio" : "📲 Instala Pollita como app"}
        </p>
        <button
          type="button"
          onClick={handleAction}
          className="shrink-0 h-7 px-3 text-[11px] font-bold text-[#0a0a12] bg-[#38BDF8] rounded-lg hover:bg-[#7DD3FC] transition-colors"
        >
          {canShowIosInstructions ? "Ver cómo" : "Instalar"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#18182a] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {showIosModal && <IosInstallModal onClose={() => setShowIosModal(false)} />}
    </>
  );
}
