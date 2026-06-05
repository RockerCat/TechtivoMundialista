import Link from "next/link";
import { getAdminDashboardStats, getAdminCommunityGroup } from "@/lib/db/admin";
import CopyInviteLinkButton from "@/components/groups/CopyInviteLinkButton";
import { CalendarDays, Users, Trophy, Link2, Activity } from "lucide-react";

export default async function AdminPage() {
  const [stats, group] = await Promise.all([
    getAdminDashboardStats(),
    getAdminCommunityGroup(),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
          Admin · La Penúltima
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Dashboard</h1>
      </div>

      {/* Summary cards */}
      {stats && (
        <>
          {/* Users row */}
          <section>
            <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-3">
              Usuarios
            </p>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Total"
                value={stats.total_users}
                icon={<Users size={14} />}
              />
              <StatCard
                label="Activos"
                value={stats.active_users}
                icon={<Activity size={14} />}
                accent="green"
              />
              <StatCard
                label="Deshabilitados"
                value={stats.disabled_users}
                icon={<Users size={14} />}
                accent={stats.disabled_users > 0 ? "red" : undefined}
              />
            </div>
          </section>

          {/* Matches row */}
          <section>
            <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-3">
              Partidos
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Predicciones"
                value={stats.total_predictions}
                icon={<Trophy size={14} />}
              />
              <StatCard
                label="Programados"
                value={stats.matches_scheduled}
                icon={<CalendarDays size={14} />}
              />
              <StatCard
                label="En vivo"
                value={stats.matches_live}
                icon={<Activity size={14} />}
                accent={stats.matches_live > 0 ? "red" : undefined}
              />
              <StatCard
                label="Finalizados"
                value={stats.matches_finished}
                icon={<CalendarDays size={14} />}
                accent="green"
              />
            </div>
          </section>
        </>
      )}

      {/* Invite card */}
      {group && (
        <section>
          <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-3">
            Invitaciones
          </p>
          <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={14} className="text-[#00c85a]" />
              <p className="text-sm font-bold text-[#f1f5f9]">{group.name}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-lg font-black text-[#f1f5f9] tracking-[0.15em]">
                {group.invite_code}
              </span>
              <CopyInviteLinkButton inviteCode={group.invite_code} />
            </div>
            <p className="text-[10px] text-[#64748b] mt-3">
              Solo el administrador puede compartir este enlace. Los usuarios regulares no ven este código.
            </p>
          </div>
        </section>
      )}

      {/* Quick links */}
      <section>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-3">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLink
            href="/admin/matches"
            icon={<CalendarDays size={16} />}
            label="Gestionar partidos"
            description="Estado, marcador y horario"
          />
          <QuickLink
            href="/admin/users"
            icon={<Users size={16} />}
            label="Gestionar usuarios"
            description="Ver, habilitar y deshabilitar"
          />
          <QuickLink
            href="/admin/ranking"
            icon={<Trophy size={16} />}
            label="Ver ranking"
            description="Tabla de posiciones en tiempo real"
          />
        </div>
      </section>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "green" | "red";
}) {
  const valueColor =
    accent === "green" ? "text-[#00c85a]" :
    accent === "red"   ? "text-[#ef4444]" :
                         "text-[#f1f5f9]";

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#64748b]">{icon}</span>
        <p className={`text-2xl font-black tabular-nums leading-none ${valueColor}`}>
          {value}
        </p>
      </div>
      <p className="text-[10px] text-[#64748b] uppercase tracking-wide">{label}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 bg-[#11111c] border border-[#1e1e35] rounded-xl p-4 hover:border-[#00c85a]/30 transition-colors group"
    >
      <span className="text-[#64748b] group-hover:text-[#00c85a] transition-colors mt-0.5">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-[#f1f5f9] group-hover:text-[#00c85a] transition-colors">
          {label}
        </p>
        <p className="text-[10px] text-[#64748b] mt-0.5">{description}</p>
      </div>
    </Link>
  );
}
