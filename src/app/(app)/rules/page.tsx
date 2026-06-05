import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { isGroupMember, getActivePlayerCount } from "@/lib/db/groups";
import { getMatchesWithPredictions } from "@/lib/db/matches";
import {
  detectCurrentStage,
  PHASE_LABELS,
  PHASE_SCORING,
  SCORING_TABLE_ROWS,
  PHASE_EQUIV_ROWS,
  type MatchStage,
} from "@/lib/matches";
import { computePrizePool, formatCOP } from "@/lib/groups";
import { cn } from "@/lib/utils";


export default async function RulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  // Fetch matches and group prize config in parallel
  const [matches, groupResult] = await Promise.all([
    getMatchesWithPredictions(user.id),
    supabase
      .from("groups")
      .select("id, entry_fee, first_place_pct, second_place_pct")
      .limit(1)
      .single(),
  ]);

  const currentStage = detectCurrentStage(matches);
  const currentPhaseLabel = PHASE_LABELS[currentStage];

  const groupData = groupResult.data as {
    id:               string;
    entry_fee:        number | null;
    first_place_pct:  number | null;
    second_place_pct: number | null;
  } | null;

  const activePlayers = groupData ? await getActivePlayerCount(groupData.id) : 0;
  const prizePool = groupData
    ? computePrizePool(
        {
          entry_fee:        groupData.entry_fee        ?? 0,
          first_place_pct:  groupData.first_place_pct  ?? 70,
          second_place_pct: groupData.second_place_pct ?? 30,
        },
        activePlayers
      )
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-[#f1f5f9]">
          Reglas de La Penúltima
        </h1>
        <p className="text-sm text-[#64748b] mt-1">
          Fase actual:{" "}
          <span className="font-semibold text-[#94a3b8]">{currentPhaseLabel}</span>
        </p>
      </div>

      {/* ── Entry fee clarification ──────────────────────────────────── */}
      {prizePool && (
        <section>
          <SectionHeader title="💰 Inscripción" />
          <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
            <RuleItem
              icon="💰"
              text={`La participación tiene un costo único de ${formatCOP(prizePool.config.entry_fee)} COP por jugador.`}
            />
            <RuleItem
              icon="🏆"
              text="Este valor cubre todo el torneo (los 104 partidos del Mundial 2026)."
            />
            <RuleItem
              icon="✓"
              text="No existen pagos adicionales por partido, por fase ni por pronóstico."
              accent="green"
            />
          </div>
        </section>
      )}

      {/* ── Prize pool ────────────────────────────────────────────────── */}
      {prizePool && (
        <section>
          <SectionHeader title="💰 Bolsa de premios" />
          <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">

            {/* Summary row */}
            <div className="px-5 py-4 border-b border-[#1e1e35] flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-[10px] text-[#64748b] uppercase tracking-widest">Total recaudado</p>
                <p className="text-3xl font-black text-[#f1f5f9] tabular-nums">{formatCOP(prizePool.total)}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-xs text-[#94a3b8]">
                  {prizePool.member_count} jugador{prizePool.member_count !== 1 ? "es" : ""} × {formatCOP(prizePool.config.entry_fee)}
                </p>
                <p className="text-[10px] text-[#64748b]">Solo jugadores activos</p>
              </div>
            </div>

            {/* Prize split */}
            <div className="divide-y divide-[#1e1e35]">
              <PrizeSplitRow
                medal="🥇"
                label="1er lugar"
                pct={prizePool.config.first_place_pct}
                amount={prizePool.first_prize}
                accent="yellow"
              />
              <PrizeSplitRow
                medal="🥈"
                label="2do lugar"
                pct={prizePool.config.second_place_pct}
                amount={prizePool.second_prize}
                accent="silver"
              />
            </div>

            {/* Note */}
            <p className="px-5 py-3 text-[10px] text-[#475569] border-t border-[#1e1e35]">
              Los montos se actualizan automáticamente según el número de participantes registrados.
            </p>
          </div>
        </section>
      )}

      {/* ── Payment note ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Nota" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5">
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            La administración de pagos se realiza directamente entre los integrantes del grupo.
            La plataforma no procesa pagos ni recauda dinero.
          </p>
        </div>
      </section>

      {/* ── Scoring table ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Sistema de puntos" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 border-b border-[#1e1e35]">
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Fase</span>
            <span className="text-[10px] font-bold text-[#f59e0b]/70 uppercase tracking-widest text-right w-24">Exacto</span>
            <span className="text-[10px] font-bold text-[#00c85a]/70 uppercase tracking-widest text-right w-24">Ganador</span>
          </div>

          {SCORING_TABLE_ROWS.map(({ stage, label }) => {
            const scoring   = PHASE_SCORING[stage];
            const isCurrent = PHASE_LABELS[stage] === currentPhaseLabel;

            return (
              <div
                key={stage}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b border-[#1e1e35] last:border-b-0",
                  isCurrent
                    ? "bg-[#00c85a]/[0.04] border-l-2 border-l-[#00c85a]/40"
                    : "hover:bg-[#18182a]/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-bold",
                    isCurrent ? "text-[#f1f5f9]" : "text-[#94a3b8]"
                  )}>
                    {label}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono text-[#00c85a] bg-[#00c85a]/10 px-1.5 py-0.5 rounded-full">
                      actual
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-sm font-black tabular-nums text-right w-24",
                  isCurrent ? "text-[#f59e0b]" : "text-[#94a3b8]"
                )}>
                  {scoring.exact} pts
                </span>
                <span className={cn(
                  "text-sm font-black tabular-nums text-right w-24",
                  isCurrent ? "text-[#00c85a]" : "text-[#94a3b8]"
                )}>
                  {scoring.result} pt{scoring.result !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Phase equivalency ─────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Equivalencia de fases" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl divide-y divide-[#1e1e35]">
          {PHASE_EQUIV_ROWS.map(({ phase, desc }) => (
            <div key={phase} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-bold text-[#f1f5f9]">{phase}</span>
              <span className="text-sm text-[#94a3b8]">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How points are calculated ─────────────────────────────────── */}
      <section>
        <SectionHeader title="Cómo se calculan los puntos" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
          <RuleItem
            icon="⚡"
            text="Si aciertas el marcador exacto, recibes los puntos de marcador exacto. El marcador exacto NO suma adicionalmente puntos por ganador correcto."
            accent="yellow"
          />
          <RuleItem
            icon="✓"
            text="Si no aciertas el marcador exacto pero aciertas el ganador o el empate, recibes los puntos de ganador correcto."
            accent="green"
          />
          <RuleItem
            icon="✕"
            text="Si no aciertas ni el marcador ni el ganador/empate, recibes 0 puntos."
            accent="red"
          />
        </div>
      </section>

      {/* ── Knockout matches ──────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Partidos de eliminación directa" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
          <RuleItem
            icon="⚽"
            text="En las rondas eliminatorias (Fase 2 en adelante), los puntos se calculan usando únicamente el marcador al final del tiempo reglamentario y, si aplica, el tiempo suplementario."
          />
          <RuleItem
            icon="⚽"
            text="Las tandas de penales NO hacen parte del marcador oficial para efectos de los pronósticos y no otorgan puntos adicionales."
            accent="yellow"
          />
          <RuleItem
            icon="⚽"
            text="Si un partido termina empatado después del tiempo reglamentario y/o suplementario, se considera empate para el cálculo de puntos, independientemente de quien gane los penales."
          />

          {/* Example box */}
          <div className="mt-2 bg-[#080810] border border-[#1e1e35] rounded-xl p-4 space-y-4">

            {/* Scores */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest">
                Ejemplo
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-[#11111c] border border-[#1e1e35] rounded-lg px-3 py-2.5">
                  <p className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest mb-1">
                    Resultado oficial
                  </p>
                  <p className="text-sm font-black text-[#f1f5f9] tabular-nums tracking-wide">
                    Argentina &nbsp;1 – 1&nbsp; Francia
                  </p>
                </div>
                <div className="flex-1 bg-[#11111c] border border-[#1e1e35] rounded-lg px-3 py-2.5 opacity-40">
                  <p className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest mb-1">
                    Penales (no cuenta)
                  </p>
                  <p className="text-sm font-black text-[#64748b] line-through tabular-nums tracking-wide">
                    Argentina &nbsp;4 – 2&nbsp; Francia
                  </p>
                </div>
              </div>
            </div>

            {/* Prediction outcomes */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest">
                Pronósticos
              </p>
              <div className="space-y-1.5">
                <PredictionRow kind="exact"   score="Argentina 1 – 1 Francia" label="Marcador exacto" />
                <PredictionRow kind="correct" score="Argentina 0 – 0 Francia" label="Ganador / Empate correcto" />
                <PredictionRow kind="wrong"   score="Argentina 2 – 1 Francia" label="Sin puntos" />
                <PredictionRow kind="wrong"   score="Argentina 1 – 2 Francia" label="Sin puntos" />
              </div>
            </div>

            <p className="text-[10px] text-[#475569] pt-1 border-t border-[#1e1e35]">
              La clasificación a la siguiente ronda mediante penales no afecta el cálculo de los puntos de La Penúltima.
            </p>
          </div>
        </div>
      </section>

      {/* ── Prediction close time ─────────────────────────────────────── */}
      <section>
        <SectionHeader title="Cierre de pronósticos" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
          <RuleItem
            icon="🕐"
            text="Los pronósticos pueden modificarse hasta antes del inicio oficial del partido."
          />
          <RuleItem
            icon="🔒"
            text="Cuando el partido pasa a En Vivo, los pronósticos quedan bloqueados."
          />
          <RuleItem
            icon="⚠"
            text="Si no ingresas un pronóstico antes del inicio, ese partido no genera puntos."
            accent="yellow"
          />
        </div>
      </section>

      {/* ── Match states ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Estados de partido" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl divide-y divide-[#1e1e35]">
          <StateRow
            label="Pronosticar"
            color="text-[#00c85a]"
            bg="bg-[#00c85a]/10"
            desc="El partido aún no ha comenzado. Puedes ingresar o modificar tu pronóstico."
          />
          <StateRow
            label="En Vivo"
            color="text-[#f59e0b]"
            bg="bg-[#f59e0b]/10"
            desc="El partido está en curso. Los pronósticos están bloqueados."
          />
          <StateRow
            label="Finalizado"
            color="text-[#94a3b8]"
            bg="bg-[#64748b]/10"
            desc="El partido terminó. Los puntos han sido calculados y asignados."
          />
        </div>
      </section>

    </div>
  );
}

function PrizeSplitRow({
  medal,
  label,
  pct,
  amount,
  accent,
}: {
  medal:  string;
  label:  string;
  pct:    number;
  amount: number;
  accent: "yellow" | "silver";
}) {
  const amountColor = accent === "yellow" ? "text-[#f59e0b]" : "text-[#94a3b8]";
  const pctColor    = accent === "yellow" ? "text-[#f59e0b]/70" : "text-[#64748b]";

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className="text-xl leading-none shrink-0">{medal}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#f1f5f9]">{label}</p>
        <p className={cn("text-[10px] tabular-nums", pctColor)}>{pct}% del total</p>
      </div>
      <p className={cn("text-xl font-black tabular-nums shrink-0", amountColor)}>
        {formatCOP(amount)}
      </p>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wide mb-3">
      {title}
    </h2>
  );
}

function RuleItem({
  icon,
  text,
  accent,
}: {
  icon: string;
  text: string;
  accent?: "yellow" | "green" | "red";
}) {
  const iconColor =
    accent === "yellow" ? "text-[#f59e0b]" :
    accent === "green"  ? "text-[#00c85a]" :
    accent === "red"    ? "text-[#ef4444]" :
    "text-[#64748b]";

  return (
    <div className="flex items-start gap-3">
      <span className={cn("text-sm shrink-0 mt-0.5", iconColor)}>{icon}</span>
      <p className="text-sm text-[#94a3b8] leading-relaxed">{text}</p>
    </div>
  );
}

function PredictionRow({
  kind,
  score,
  label,
}: {
  kind: "exact" | "correct" | "wrong";
  score: string;
  label: string;
}) {
  const icon  = kind === "wrong" ? "✕" : "✓";
  const iconColor =
    kind === "exact"   ? "text-[#f59e0b]" :
    kind === "correct" ? "text-[#00c85a]" :
    "text-[#ef4444]";
  const scoreColor = kind === "wrong" ? "text-[#475569]" : "text-[#f1f5f9]";
  const labelColor =
    kind === "exact"   ? "text-[#f59e0b]" :
    kind === "correct" ? "text-[#00c85a]" :
    "text-[#475569]";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={cn("text-xs font-bold shrink-0 w-4 text-center", iconColor)}>{icon}</span>
      <span className={cn("text-xs font-mono font-semibold tabular-nums shrink-0", scoreColor)}>
        {score}
      </span>
      <span className={cn("text-[10px] shrink-0", labelColor)}>→ {label}</span>
    </div>
  );
}

function StateRow({
  label,
  color,
  bg,
  desc,
}: {
  label: string;
  color: string;
  bg: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <span className={cn(
        "text-[10px] font-bold px-2 py-1 rounded-md shrink-0 mt-0.5",
        color, bg
      )}>
        {label.toUpperCase()}
      </span>
      <p className="text-sm text-[#94a3b8] leading-relaxed">{desc}</p>
    </div>
  );
}
