"use client";

import { useState, useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import { PHASE_SCORING, SCORING_TABLE_ROWS } from "@/lib/matches";
import { formatCOP, FIXED_FIRST_PRIZE, FIXED_SECOND_PRIZE } from "@/lib/groups";

export default function RulesDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Card */}
      <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center shrink-0 text-lg">
            📖
          </div>
          <p className="text-sm font-bold text-[#f1f5f9]">Reglas de Techtivo Pollita</p>
        </div>

        <ul className="space-y-2 mb-4">
          <li className="flex items-center gap-2.5 text-xs text-[#94a3b8]">
            <span className="w-5 h-5 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] flex items-center justify-center text-[10px] font-black shrink-0">
              3
            </span>
            Marcador exacto: 3 puntos (fase de grupos)
          </li>
          <li className="flex items-center gap-2.5 text-xs text-[#94a3b8]">
            <span className="w-5 h-5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center text-[10px] font-black shrink-0">
              1
            </span>
            Ganador correcto: 1 punto (fase de grupos)
          </li>
          <li className="flex items-center gap-2.5 text-xs text-[#94a3b8]">
            <span className="text-base leading-none shrink-0">⚽</span>
            Bolsa de premios para los mejores participantes
          </li>
        </ul>

        <button
          onClick={() => setOpen(true)}
          className="w-full h-10 flex items-center justify-center gap-2 bg-[#11111c] border border-[#2a2a45] text-[#94a3b8] text-sm font-medium rounded-xl hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors"
        >
          <BookOpen size={14} />
          Ver reglas completas
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative z-10 w-full max-h-[92dvh] flex flex-col bg-[#11111c] border border-[#2a2a45] rounded-t-3xl sm:rounded-2xl sm:max-w-md sm:mx-4 sm:max-h-[85vh] animate-fade-in-up">
            {/* Handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#2a2a45]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e35] shrink-0">
              <h2 className="text-base font-bold text-[#f1f5f9]">Reglas de Techtivo Pollita</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#20203a] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">

              {/* Entry fee clarification */}
              <section>
                <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-3">
                  Inscripción
                </h3>
                <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#f1f5f9]">Participación sin costo</span>
                    <span className="text-sm font-black text-[#22c55e] shrink-0">Gratis</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    La participación es completamente gratuita. No existen cobros por partido, por fase ni por pronóstico.
                  </p>
                </div>
              </section>

              {/* Scoring table */}
              <section>
                <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-3">
                  Sistema de puntos
                </h3>
                <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2.5 border-b border-[#1e1e35]">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Fase</span>
                    <span className="text-[10px] font-bold text-[#f59e0b]/70 uppercase tracking-widest text-right w-[72px]">Exacto</span>
                    <span className="text-[10px] font-bold text-[#38BDF8]/70 uppercase tracking-widest text-right w-[72px]">Ganador</span>
                  </div>

                  {SCORING_TABLE_ROWS.map(({ stage, label }) => {
                    const scoring = PHASE_SCORING[stage];
                    return (
                      <div
                        key={stage}
                        className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 border-b border-[#1e1e35] last:border-b-0"
                      >
                        <span className="text-sm text-[#94a3b8]">{label}</span>
                        <span className="text-sm font-black text-[#f59e0b] text-right w-[72px] tabular-nums">
                          {scoring.exact} pts
                        </span>
                        <span className="text-sm font-black text-[#38BDF8] text-right w-[72px] tabular-nums">
                          {scoring.result} pt{scoring.result !== 1 ? "s" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Fixed prizes — sponsored by Techtivo */}
              <section>
                <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-3">
                  Premios
                </h3>
                <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl overflow-hidden">

                  {/* Sponsor note */}
                  <div className="px-4 py-3 border-b border-[#1e1e35]">
                    <p className="text-[10px] text-[#22c55e]/80 font-semibold">
                      Patrocinados por Techtivo · No dependen del número de participantes
                    </p>
                  </div>

                  {/* Prizes */}
                  <div className="divide-y divide-[#1e1e35]">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl shrink-0">🥇</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#f1f5f9]">1er lugar</p>
                        <p className="text-[10px] text-[#64748b]">Premio fijo</p>
                      </div>
                      <span className="text-sm font-black text-[#f59e0b] tabular-nums shrink-0">
                        {formatCOP(FIXED_FIRST_PRIZE)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl shrink-0">🥈</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#f1f5f9]">2do lugar</p>
                        <p className="text-[10px] text-[#64748b]">Premio fijo</p>
                      </div>
                      <span className="text-sm font-black text-[#94a3b8] tabular-nums shrink-0">
                        {formatCOP(FIXED_SECOND_PRIZE)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Note */}
              <section>
                <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl p-4">
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    <span className="text-[#94a3b8] font-semibold">Nota:</span>{" "}
                    La plataforma no procesa pagos ni recauda dinero. Los premios son gestionados directamente por los participantes del grupo.
                  </p>
                </div>
              </section>

              {/* Bottom padding for iOS safe area */}
              <div className="h-safe-b" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
