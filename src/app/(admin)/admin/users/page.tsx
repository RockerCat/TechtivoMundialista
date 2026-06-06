import { getAdminUsers } from "@/lib/db/admin";
import UserToggleButton from "@/components/admin/UserToggleButton";
import { formatRelativeDate } from "@/lib/groups";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

      <div>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
          Admin · Usuarios
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">
          Usuarios
        </h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          {users.length} participante{users.length !== 1 ? "s" : ""} en Techtivo Pollita
        </p>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-[#64748b]">No hay usuarios registrados.</p>
      ) : (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#1e1e35] text-[10px] font-semibold text-[#64748b] uppercase tracking-widest">
            <span>Usuario</span>
            <span className="text-right">Pts</span>
            <span className="text-right">Preds</span>
            <span></span>
          </div>

          {/* User rows */}
          <div className="divide-y divide-[#1e1e35]">
            {users.map((u) => (
              <div
                key={u.user_id}
                className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 ${
                  u.is_disabled ? "opacity-50" : ""
                }`}
              >
                {/* Identity */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-[#f1f5f9] truncate">
                      {u.display_name}
                    </p>
                    {u.is_disabled && (
                      <span className="text-[9px] font-bold text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">
                        Deshabilitado
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#64748b] truncate">{u.email}</p>
                  <p className="text-[10px] text-[#2a2a45]">
                    Unido {formatRelativeDate(u.joined_at)} · ⚡{u.exact_count} ✓{u.result_count}
                  </p>
                </div>

                {/* Points */}
                <p className="text-sm font-black tabular-nums text-[#f1f5f9] text-right">
                  {u.total_points}
                </p>

                {/* Prediction count */}
                <p className="text-xs text-[#94a3b8] tabular-nums text-right">
                  {u.pred_count}
                </p>

                {/* Actions */}
                <UserToggleButton userId={u.user_id} isDisabled={u.is_disabled} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#11111c] border border-[#1e1e35] rounded-xl p-4">
        <p className="text-xs text-[#94a3b8] leading-relaxed">
          <strong className="text-[#94a3b8]">Deshabilitar</strong> impide que el usuario guarde predicciones. El usuario sigue pudiendo iniciar sesión y ver el dashboard, pero no aparece en el ranking.
          Los registros de predicción existentes se conservan.
        </p>
      </div>
    </div>
  );
}
