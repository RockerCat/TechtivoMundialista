"use client";

import { useState, useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import { PHASE_SCORING, SCORING_TABLE_ROWS } from "@/lib/matches";
import { formatCOP } from "@/lib/groups";


const EXAMPLE_PLAYERS = 10;

interface RulesDrawerProps {
  entryFee:       number | null;
  firstPlacePct:  number | null;
  secondPlacePct: number | null;
}

export default function RulesDrawer({
  entryFee,
  firstPlacePct,
  secondPlacePct,
}: RulesDrawerProps) {
  const [open, setOpen] = useState(false);

  const pct1 = firstPlacePct  ?? 70;
  const pct2 = secondPlacePct ?? 30;
  const exampleTotal  = entryFee ? entryFee * EXAMPLE_PLAYERS : null;
  const exampleFirst  = exampleTotal ? Math.round(exampleTotal * pct1 / 100) : null;
  const exampleSecond = exampleTotal ? Math.round(exampleTotal * pct2 / 100) : null;

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
          <p className="text-sm font-bold text-[#f1f5f9]">Reglas de Techtivo Mundialista</p>
        </div>

        <ul className="space-y-2 mb-4">
          <li className="flex items-center gap-2.5 text-xs text-[#94a3b8]">
            <span className="w-5 h-5 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] flex items-center justify-center text-[10px] font-black shrink-0">
              3
            </span>
            Marcador exacto: 3 puntos (fase de grupos)
          </li>
          <li className="flex items-center gap-2.5 text-xs text-[#94a3b8]">
            <span className="w-5 h-5 rounded-full bg-[#00c85a]/15 text-[#00c85a] flex items-center justify-center text-[10px] font-black shrink-0">
              1
            </span>
            Ganador correcto: 1 punto (fase de grupos)
          </li>
          <li className="flex items-center gap-2.5 text-xs text-[#94a3b8]">
            <span className="text-base leading-none shrink-0">🏆</span>
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
              <h2 className="text-base font-bold text-[#f1f5f9]">Reglas de Techtivo Mundialista</h2>
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
              {entryFee && (
                <section>
                  <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-3">
                    Inscripción
                  </h3>
                  <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#f1f5f9]">Inscripción única por jugador</span>
                      <span className="text-sm font-black text-[#f59e0b] tabular-nums shrink-0">{formatCOP(entryFee)}</span>
                    </div>
                    <p className="text-xs text-[#64748b] leading-relaxed">
                      Este valor cubre todo el torneo (los 104 partidos del Mundial 2026).
                      No existen cobros adicionales por partido, por fase ni por pronóstico.
                    </p>
                  </div>
                </section>
              )}

              {/* Scoring table */}
              <section>
                <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-3">
                  Sistema de puntos
                </h3>
                <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2.5 border-b border-[#1e1e35]">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Fase</span>
                    <span className="text-[10px] font-bold text-[#f59e0b]/70 uppercase tracking-widest text-right w-[72px]">Exacto</span>
                    <span className="text-[10px] font-bold text-[#00c85a]/70 uppercase tracking-widest text-right w-[72px]">Ganador</span>
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
                        <span className="text-sm font-black text-[#00c85a] text-right w-[72px] tabular-nums">
                          {scoring.result} pt{scoring.result !== 1 ? "s" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Prize pool — static distribution rules, no live data */}
              {entryFee && (
                <section>
                  <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-3">
                    Bolsa de premios
                  </h3>
                  <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl overflow-hidden">

                    {/* Entry fee */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e35]">
                      <span className="text-sm text-[#94a3b8]">Inscripción única por jugador</span>
                      <span className="text-sm font-black text-[#f1f5f9] tabular-nums">
                        {formatCOP(entryFee)}
                      </span>
                    </div>

                    {/* Distribution */}
                    <div className="px-4 py-3 border-b border-[#1e1e35]">
                      <p className="text-[10px] text-[#64748b] uppercase tracking-wide mb-2.5">
                        Distribución de la bolsa
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xl shrink-0">🥇</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#f1f5f9]">1er lugar</p>
                          </div>
                          <span className="text-sm font-black text-[#f59e0b] tabular-nums shrink-0">
                            {pct1}% del total recaudado
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl shrink-0">🥈</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#f1f5f9]">2do lugar</p>
                          </div>
                          <span className="text-sm font-black text-[#94a3b8] tabular-nums shrink-0">
                            {pct2}% del total recaudado
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Example */}
                    {exampleTotal && exampleFirst && exampleSecond && (
                      <div className="px-4 py-3">
                        <p className="text-[10px] text-[#64748b] uppercase tracking-wide mb-2">
                          Ejemplo — {EXAMPLE_PLAYERS} participantes
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#64748b]">
                              Bolsa total ({EXAMPLE_PLAYERS} × {formatCOP(entryFee)})
                            </span>
                            <span className="font-bold text-[#94a3b8] tabular-nums">
                              {formatCOP(exampleTotal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#64748b]">🥇 1er lugar</span>
                            <span className="font-black text-[#f59e0b] tabular-nums">
                              {formatCOP(exampleFirst)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#64748b]">🥈 2do lugar</span>
                            <span className="font-black text-[#94a3b8] tabular-nums">
                              {formatCOP(exampleSecond)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Note */}
              <section>
                <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl p-4">
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    <span className="text-[#94a3b8] font-semibold">Nota:</span>{" "}
                    La administración de pagos se realiza directamente entre los integrantes del grupo.
                    La plataforma no procesa pagos ni recauda dinero.
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
