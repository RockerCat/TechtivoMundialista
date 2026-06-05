import { getAdminCommunityGroup } from "@/lib/db/admin";
import { getActivePlayerCount } from "@/lib/db/groups";
import CopyInviteLinkButton from "@/components/groups/CopyInviteLinkButton";
import CopyButton from "@/components/groups/CopyButton";
import InvitationMessageButton from "@/components/admin/InvitationMessageButton";
import PrizeConfigForm from "@/components/admin/PrizeConfigForm";
import { ShieldAlert } from "lucide-react";
import { formatCOP, computePrizePool } from "@/lib/groups";

export default async function AdminInvitationsPage() {
  const group = await getAdminCommunityGroup();
  // Use active player count (excludes admins and disabled users) for prize calculations
  const activePlayers = group ? await getActivePlayerCount(group.id) : 0;

  const prizePool = group
    ? computePrizePool(
        {
          entry_fee:        group.entry_fee        ?? 0,
          first_place_pct:  group.first_place_pct  ?? 70,
          second_place_pct: group.second_place_pct ?? 30,
        },
        activePlayers
      )
    : null;

  return (
    <div className="max-w-xl mx-auto px-6 py-8 space-y-6">

      <div>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
          Admin · Invitaciones
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Invitar al grupo</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          Solo el administrador puede compartir el enlace de acceso.
        </p>
      </div>

      {group ? (
        <>
          {/* Invite code card */}
          <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">Grupo</p>
              <p className="text-base font-bold text-[#f1f5f9]">{group.name}</p>
            </div>

            <div>
              <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-2">Código de invitación</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-black text-[#f1f5f9] tracking-[0.2em]">
                  {group.invite_code}
                </span>
                <CopyButton text={group.invite_code} />
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-2">Enlace de invitación</p>
              <div className="flex items-center gap-3">
                <code className="text-xs text-[#94a3b8] bg-[#18182a] border border-[#2a2a45] rounded-lg px-3 py-2 flex-1 truncate">
                  /invite/{group.invite_code}
                </code>
                <CopyInviteLinkButton inviteCode={group.invite_code} />
                <InvitationMessageButton inviteCode={group.invite_code} />
              </div>
            </div>
          </div>

          {/* Prize pool configuration */}
          <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
                Bolsa del Mundial
              </p>
              <h2 className="text-base font-bold text-[#f1f5f9]">Configuración de premios</h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Solo informativo — Techtivo Mundialista no procesa pagos.
              </p>
            </div>

            {/* Live preview */}
            {prizePool && (
              <div className="bg-[#18182a] border border-[#2a2a45] rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-[#64748b] uppercase tracking-widest">Vista previa</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94a3b8]">{activePlayers} jugadores activos × {formatCOP(prizePool.config.entry_fee)}</span>
                  <span className="text-base font-black text-[#f1f5f9]">{formatCOP(prizePool.total)}</span>
                </div>
                <div className="text-xs text-[#94a3b8] space-y-0.5">
                  <p>🥇 {formatCOP(prizePool.first_prize)} ({prizePool.config.first_place_pct}%)</p>
                  <p>🥈 {formatCOP(prizePool.second_prize)} ({prizePool.config.second_place_pct}%)</p>
                </div>
              </div>
            )}

            <PrizeConfigForm
              groupId={group.id}
              entryFee={group.entry_fee ?? 20000}
              firstPlacePct={group.first_place_pct ?? 70}
              secondPlacePct={group.second_place_pct ?? 30}
            />
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-3 bg-[#f59e0b]/[0.06] border border-[#f59e0b]/20 rounded-xl p-4">
            <ShieldAlert size={16} className="text-[#f59e0b] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#f59e0b] mb-1">Solo para uso interno</p>
              <p className="text-[10px] text-[#94a3b8] leading-relaxed">
                Este enlace permite unirse a Techtivo Mundialista. Compártelo únicamente con los participantes invitados.
                Los usuarios regulares no ven este código desde sus pantallas.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-8 text-center">
          <p className="text-sm text-[#64748b]">No hay grupo configurado.</p>
          <p className="text-[10px] text-[#2a2a45] mt-1">
            Crea un grupo primero desde el panel de gestión.
          </p>
        </div>
      )}
    </div>
  );
}
