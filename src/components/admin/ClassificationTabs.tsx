"use client";

import { useState } from "react";
import type {
  GroupStanding,
  TeamStanding,
  KnockoutPreviewMatch,
} from "@/lib/classification";
import { STAGE_LABELS } from "@/lib/matches";

// ── Types ──────────────────────────────────────────────────────────────

interface Props {
  groups: GroupStanding[];
  bestThirds: TeamStanding[];
  roundOf32: KnockoutPreviewMatch[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function positionClass(idx: number): string {
  if (idx === 0) return "border-l-2 border-l-[#f59e0b]";
  if (idx === 1) return "border-l-2 border-l-[#38BDF8]";
  if (idx === 2) return "border-l-2 border-l-[#f59e0b]/50";
  return "border-l-2 border-l-transparent";
}

function goalDiffClass(d: number): string {
  if (d > 0) return "text-[#38BDF8]";
  if (d < 0) return "text-red-400";
  return "text-[#64748b]";
}

function fmtDiff(d: number): string {
  return d > 0 ? `+${d}` : String(d);
}

// ── GroupCard ──────────────────────────────────────────────────────────

function GroupCard({ group }: { group: GroupStanding }) {
  const matchesPlayed = group.teams.reduce((s, t) => s + t.played, 0) / 2;

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e35] flex items-center justify-between">
        <h3 className="text-xs font-black text-[#f1f5f9] uppercase tracking-widest">
          Grupo {group.group_code}
        </h3>
        <span className="text-[10px] font-mono text-[#64748b]">
          {matchesPlayed}/6 partidos
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e1e35]">
              <th className="pl-3 pr-1 py-2 text-left text-[10px] font-semibold text-[#64748b] uppercase w-6">#</th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold text-[#64748b] uppercase min-w-[96px]">Equipo</th>
              {["PJ","G","E","P","GF","GC","DG","PTS"].map((h) => (
                <th key={h} className="px-1.5 py-2 text-center text-[10px] font-semibold text-[#64748b] uppercase w-8">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e35]">
            {group.teams.map((s, idx) => (
              <tr key={s.team.id} className={positionClass(idx)}>
                <td className="pl-3 pr-1 py-2.5 text-[10px] font-mono text-[#64748b] text-center">{idx + 1}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">{s.team.flag_emoji ?? "🏳️"}</span>
                    <span className={`text-[11px] font-bold ${idx <= 1 ? "text-[#f1f5f9]" : "text-[#94a3b8]"}`}>
                      {s.team.code}
                    </span>
                  </div>
                </td>
                <td className="px-1.5 py-2.5 text-center font-mono text-[#94a3b8]">{s.played}</td>
                <td className="px-1.5 py-2.5 text-center font-mono text-[#94a3b8]">{s.won}</td>
                <td className="px-1.5 py-2.5 text-center font-mono text-[#94a3b8]">{s.drawn}</td>
                <td className="px-1.5 py-2.5 text-center font-mono text-[#94a3b8]">{s.lost}</td>
                <td className="px-1.5 py-2.5 text-center font-mono text-[#94a3b8]">{s.goals_for}</td>
                <td className="px-1.5 py-2.5 text-center font-mono text-[#94a3b8]">{s.goals_against}</td>
                <td className={`px-1.5 py-2.5 text-center font-mono ${goalDiffClass(s.goal_diff)}`}>
                  {fmtDiff(s.goal_diff)}
                </td>
                <td className={`px-1.5 py-2.5 text-center font-black text-sm ${idx === 0 ? "text-[#f59e0b]" : idx === 1 ? "text-[#38BDF8]" : "text-[#94a3b8]"}`}>
                  {s.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Grupos ────────────────────────────────────────────────────────

function GruposTab({ groups }: { groups: GroupStanding[] }) {
  if (groups.length === 0) {
    return (
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-6 py-10 text-center">
        <p className="text-sm text-[#64748b]">
          No hay partidos de fase de grupos registrados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-[10px] text-[#64748b]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> 1° — clasifica directo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8]" /> 2° — clasifica directo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]/40" /> 3° — posible mejor tercero
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <GroupCard key={g.group_code} group={g} />
        ))}
      </div>
    </div>
  );
}

// ── Tab: Clasificados ──────────────────────────────────────────────────

function ClasificadosTab({
  groups,
  bestThirds,
  roundOf32,
}: {
  groups: GroupStanding[];
  bestThirds: TeamStanding[];
  roundOf32: KnockoutPreviewMatch[];
}) {
  return (
    <div className="space-y-8">

      {/* ── Clasificados directos ──────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-black text-[#f1f5f9] uppercase tracking-widest">
            Clasificados directos
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            1° y 2° de cada grupo · 24 equipos
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const first  = group.teams[0];
            const second = group.teams[1];
            return (
              <div
                key={group.group_code}
                className="bg-[#11111c] border border-[#1e1e35] rounded-xl px-4 py-3 space-y-1.5"
              >
                <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                  Grupo {group.group_code}
                </p>

                {first ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-[#f59e0b] w-4">1°</span>
                    <span className="text-sm leading-none">{first.team.flag_emoji ?? "🏳️"}</span>
                    <span className="text-xs font-semibold text-[#f1f5f9]">{first.team.code}</span>
                    <span className="text-[10px] text-[#64748b] truncate flex-1 min-w-0">{first.team.name}</span>
                    <span className="text-[10px] font-black text-[#f59e0b] shrink-0">{first.points}pts</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 opacity-40">
                    <span className="text-[9px] font-bold text-[#f59e0b] w-4">1°</span>
                    <span className="text-[10px] text-[#64748b]">Por definir</span>
                  </div>
                )}

                {second ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-[#38BDF8] w-4">2°</span>
                    <span className="text-sm leading-none">{second.team.flag_emoji ?? "🏳️"}</span>
                    <span className="text-xs font-semibold text-[#94a3b8]">{second.team.code}</span>
                    <span className="text-[10px] text-[#64748b] truncate flex-1 min-w-0">{second.team.name}</span>
                    <span className="text-[10px] font-black text-[#38BDF8] shrink-0">{second.points}pts</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 opacity-40">
                    <span className="text-[9px] font-bold text-[#38BDF8] w-4">2°</span>
                    <span className="text-[10px] text-[#64748b]">Por definir</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Mejores terceros ───────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-black text-[#f1f5f9] uppercase tracking-widest">
            Mejores Terceros
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            12 terceros clasificados · los 8 mejores avanzan
          </p>
        </div>

        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e1e35]">
                  <th className="pl-4 pr-1 py-2 text-left text-[10px] font-semibold text-[#64748b] uppercase w-8">#</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-[#64748b] uppercase">Equipo</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-[#64748b] uppercase w-8">PJ</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-[#64748b] uppercase w-8">G</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-[#64748b] uppercase w-10">DG</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-[#64748b] uppercase w-8">GF</th>
                  <th className="px-2 pr-4 py-2 text-center text-[10px] font-semibold text-[#64748b] uppercase w-10">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e35]">
                {bestThirds.map((s, idx) => {
                  const advances = idx < 8;
                  return (
                    <tr
                      key={s.team.id}
                      className={`${advances ? "border-l-2 border-l-[#f59e0b]/60" : "border-l-2 border-l-transparent opacity-40"}`}
                    >
                      <td className="pl-4 pr-1 py-2.5 text-[10px] font-mono text-[#64748b] text-center">{idx + 1}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm leading-none">{s.team.flag_emoji ?? "🏳️"}</span>
                          <span className={`text-[11px] font-bold ${advances ? "text-[#f1f5f9]" : "text-[#64748b]"}`}>
                            {s.team.code}
                          </span>
                          <span className="text-[10px] text-[#64748b] hidden sm:inline">{s.team.name}</span>
                          <span className="text-[9px] font-mono text-[#64748b] bg-[#1e1e35] rounded px-1 ml-1">
                            G{s.group_code}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-[#94a3b8]">{s.played}</td>
                      <td className="px-2 py-2.5 text-center font-mono text-[#94a3b8]">{s.won}</td>
                      <td className={`px-2 py-2.5 text-center font-mono ${goalDiffClass(s.goal_diff)}`}>
                        {fmtDiff(s.goal_diff)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-[#94a3b8]">{s.goals_for}</td>
                      <td className={`px-2 pr-4 py-2.5 text-center font-black text-sm ${advances ? "text-[#f59e0b]" : "text-[#94a3b8]"}`}>
                        {s.points}
                      </td>
                    </tr>
                  );
                })}
                {bestThirds.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#64748b] text-xs">
                      No hay datos suficientes aún — los terceros aparecerán al finalizar partidos del grupo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {bestThirds.length > 8 && (
          <p className="text-[10px] text-[#64748b]">
            Posiciones 1–8 clasifican · posiciones 9–12 eliminadas
          </p>
        )}
      </section>

      {/* ── Dieciseisavos — vista previa ──────────────────────────── */}
      {roundOf32.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-black text-[#f1f5f9] uppercase tracking-widest">
              {STAGE_LABELS.round_of_32} — Vista previa
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              M73–M88 · 16 partidos
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {roundOf32.map((match) => {
              const homeFlag  = match.home_team?.flag_emoji ?? null;
              const homeCode  = match.home_team?.code ?? match.home_placeholder ?? "TBD";
              const awayFlag  = match.away_team?.flag_emoji ?? null;
              const awayCode  = match.away_team?.code ?? match.away_placeholder ?? "TBD";
              const isSet     = !!(match.home_team && match.away_team);

              return (
                <div
                  key={match.id}
                  className="bg-[#11111c] border border-[#1e1e35] rounded-xl px-3 py-2.5 flex items-center gap-2"
                >
                  <span className="text-[10px] font-mono text-[#64748b] shrink-0 w-9">
                    M{match.match_number}
                  </span>

                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className={`flex items-center gap-1 min-w-0 ${!homeFlag ? "opacity-50" : ""}`}>
                      <span className="text-sm leading-none shrink-0">{homeFlag ?? "🏳️"}</span>
                      <span className="text-[11px] font-semibold text-[#f1f5f9] truncate" title={homeCode}>
                        {homeCode}
                      </span>
                    </div>

                    <span className="text-[10px] text-[#2a2a45] shrink-0">vs</span>

                    <div className={`flex items-center gap-1 min-w-0 ${!awayFlag ? "opacity-50" : ""}`}>
                      <span className="text-sm leading-none shrink-0">{awayFlag ?? "🏳️"}</span>
                      <span className="text-[11px] font-semibold text-[#f1f5f9] truncate" title={awayCode}>
                        {awayCode}
                      </span>
                    </div>
                  </div>

                  {!isSet && (
                    <span className="text-[9px] text-[#64748b] border border-[#2a2a45] rounded px-1 py-0.5 shrink-0 font-mono">
                      TBD
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function ClassificationTabs({ groups, bestThirds, roundOf32 }: Props) {
  const [tab, setTab] = useState<"groups" | "classified">("groups");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-[#11111c] border border-[#1e1e35] rounded-xl p-1 w-fit">
        {(["groups", "classified"] as const).map((t) => {
          const label = t === "groups" ? "Grupos" : "Clasificados";
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? "bg-[#38BDF8]/10 text-[#38BDF8]"
                  : "text-[#64748b] hover:text-[#94a3b8]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "groups" ? (
        <GruposTab groups={groups} />
      ) : (
        <ClasificadosTab groups={groups} bestThirds={bestThirds} roundOf32={roundOf32} />
      )}
    </div>
  );
}
