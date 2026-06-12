import { getAdminCommunityGroup } from "@/lib/db/admin";
import CopyInviteLinkButton from "@/components/groups/CopyInviteLinkButton";
import CopyButton from "@/components/groups/CopyButton";
import InvitationMessageButton from "@/components/admin/InvitationMessageButton";
import { ShieldAlert } from "lucide-react";
import { formatCOP, FIXED_FIRST_PRIZE, FIXED_SECOND_PRIZE } from "@/lib/groups";

export default async function AdminInvitationsPage() {
  const group = await getAdminCommunityGroup();

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

          {/* Fixed prizes info */}
          <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
                Premios del Mundial
              </p>
              <h2 className="text-base font-bold text-[#f1f5f9]">Premios fijos</h2>
              <p className="text-xs text-[#22c55e]/80 font-semibold mt-0.5">
                Patrocinados por Techtivo · Inscripción gratis · No dependen del número de participantes
              </p>
            </div>

            <div className="bg-[#18182a] border border-[#2a2a45] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a45]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥇</span>
                  <span className="text-sm font-bold text-[#f1f5f9]">1er lugar</span>
                </div>
                <span className="text-base font-black text-[#f59e0b] tabular-nums">{formatCOP(FIXED_FIRST_PRIZE)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥈</span>
                  <span className="text-sm font-bold text-[#f1f5f9]">2do lugar</span>
                </div>
                <span className="text-base font-black text-[#94a3b8] tabular-nums">{formatCOP(FIXED_SECOND_PRIZE)}</span>
              </div>
            </div>

            <p className="text-[10px] text-[#475569]">
              Los premios son fijos y están definidos en el código. No se calculan en función de participantes ni inscripción.
            </p>
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-3 bg-[#f59e0b]/[0.06] border border-[#f59e0b]/20 rounded-xl p-4">
            <ShieldAlert size={16} className="text-[#f59e0b] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#f59e0b] mb-1">Solo para uso interno</p>
              <p className="text-[10px] text-[#94a3b8] leading-relaxed">
                Este enlace permite unirse a Techtivo Pollita. Compártelo únicamente con los participantes invitados.
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
