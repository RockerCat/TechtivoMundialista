"use client";

import { useState } from "react";
import { Share, SquarePlus, CheckCircle2, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export default function InstallAppButton() {
  const { shouldShowButton, canPromptAndroid, canShowIosInstructions, promptAndroidInstall } =
    usePwaInstall();
  const [showIosModal, setShowIosModal] = useState(false);

  if (!shouldShowButton) return null;

  function handleClick() {
    if (canPromptAndroid) {
      promptAndroidInstall();
    } else if (canShowIosInstructions) {
      setShowIosModal(true);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#1e1e35]">
      <button
        type="button"
        onClick={handleClick}
        className="w-full h-9 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#38BDF8] bg-[#38BDF8]/8 border border-[#38BDF8]/20 rounded-xl hover:bg-[#38BDF8]/15 transition-colors"
      >
        {canShowIosInstructions ? "📲 Agregar al inicio" : "📲 Instalar App"}
      </button>

      {showIosModal && <IosInstallModal onClose={() => setShowIosModal(false)} />}
    </div>
  );
}

export function IosInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full bg-[#11111c] border border-[#2a2a45] rounded-t-3xl sm:rounded-2xl sm:max-w-sm sm:mx-4 animate-fade-in-up">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#2a2a45]" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e35]">
          <h2 className="text-base font-bold text-[#f1f5f9]">📲 Agregar Pollita al inicio</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#20203a] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <InstructionStep
            icon={<Share size={16} className="text-[#38BDF8]" />}
            text={
              <>
                Toca el botón <span className="font-semibold text-[#f1f5f9]">Compartir</span>
              </>
            }
          />
          <InstructionStep
            icon={<SquarePlus size={16} className="text-[#38BDF8]" />}
            text={
              <>
                Selecciona{" "}
                <span className="font-semibold text-[#f1f5f9]">&quot;Agregar a inicio&quot;</span>
              </>
            }
          />
          <InstructionStep
            icon={<CheckCircle2 size={16} className="text-[#38BDF8]" />}
            text={<>Confirma la instalación</>}
          />
        </div>
      </div>
    </div>
  );
}

function InstructionStep({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <p className="text-sm text-[#94a3b8] leading-relaxed">{text}</p>
    </div>
  );
}
