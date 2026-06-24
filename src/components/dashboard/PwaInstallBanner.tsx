"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { IosInstallModal } from "@/components/auth/InstallAppButton";

// Dismissal is intentionally in-memory only (per Home mount), so the banner
// reappears next time the user lands on Home — see banner dismissal task.
// This key is purged below in case it was set by an earlier version that
// persisted dismissal in localStorage.
const LEGACY_DISMISS_KEY = "pollita_pwa_install_banner_dismissed";

export default function PwaInstallBanner() {
  const { shouldShowButton, canPromptAndroid, canShowIosInstructions, promptAndroidInstall } =
    usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    localStorage.removeItem(LEGACY_DISMISS_KEY);
  }, []);

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
