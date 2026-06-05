import { getAdminActivityLog } from "@/lib/db/admin";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  match_result:      { label: "Resultado actualizado",  color: "text-[#00c85a]"  },
  match_fixture:     { label: "Fixture corregido",      color: "text-[#3b82f6]"  },
  user_disable:      { label: "Usuario deshabilitado",  color: "text-[#ef4444]"  },
  user_enable:       { label: "Usuario habilitado",     color: "text-[#00c85a]"  },
  recalculate_scores:{ label: "Puntos recalculados",    color: "text-[#f59e0b]"  },
};

function diffLabel(old_: unknown, new_: unknown): string | null {
  if (!old_ || !new_) return null;
  const o = old_ as Record<string, unknown>;
  const n = new_ as Record<string, unknown>;
  const parts: string[] = [];

  if (o.status !== n.status)
    parts.push(`${o.status} → ${n.status}`);
  if (o.home_score !== undefined || o.away_score !== undefined) {
    const oldScore = o.home_score !== null ? `${o.home_score}–${o.away_score}` : "–";
    const newScore = n.home_score !== null ? `${n.home_score}–${n.away_score}` : "–";
    if (oldScore !== newScore) parts.push(`${oldScore} → ${newScore}`);
  }
  if (o.starts_at !== n.starts_at && n.starts_at) {
    const d = new Date(n.starts_at as string);
    parts.push(`kickoff: ${d.toISOString().slice(0, 16)} UTC`);
  }
  if (o.group_code !== n.group_code)
    parts.push(`grupo: ${o.group_code ?? "–"} → ${n.group_code ?? "–"}`);

  return parts.length ? parts.join(" · ") : null;
}

export default async function AdminActivityPage() {
  const entries = await getAdminActivityLog(200);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
          Admin · Actividad
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Historial de cambios</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          Últimas {entries.length} acciones administrativas
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-8 text-center">
          <p className="text-sm text-[#64748b]">No hay actividad registrada todavía.</p>
          <p className="text-[10px] text-[#2a2a45] mt-1">
            Las acciones aparecerán aquí después de la primera modificación.
          </p>
        </div>
      ) : (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_auto_1fr_auto] gap-4 px-5 py-3 border-b border-[#1e1e35] text-[9px] font-semibold text-[#64748b] uppercase tracking-widest">
            <span>Fecha</span>
            <span>Admin</span>
            <span>Detalle</span>
            <span className="text-right">Cambio</span>
          </div>

          <div className="divide-y divide-[#1e1e35]">
            {entries.map((entry) => {
              const meta  = ACTION_LABELS[entry.action] ?? { label: entry.action, color: "text-[#94a3b8]" };
              const diff  = diffLabel(entry.old_values, entry.new_values);
              const dateStr = new Date(entry.created_at).toLocaleString("es-CO", {
                month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
                timeZone: "America/Bogota",
              });

              return (
                <div key={entry.id} className="grid grid-cols-[auto_auto_1fr_auto] gap-4 items-start px-5 py-3">
                  {/* Date */}
                  <p className="text-[10px] text-[#64748b] font-mono whitespace-nowrap pt-0.5">
                    {dateStr}
                  </p>

                  {/* Admin */}
                  <p className="text-xs font-semibold text-[#94a3b8] whitespace-nowrap">
                    {entry.admin_name}
                  </p>

                  {/* Action + entity */}
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
                    <p className="text-[10px] text-[#64748b] truncate">{entry.entity_label}</p>
                  </div>

                  {/* Diff */}
                  {diff && (
                    <p className="text-[10px] text-[#94a3b8] text-right whitespace-nowrap font-mono">
                      {diff}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
