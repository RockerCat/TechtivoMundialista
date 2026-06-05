import Link from "next/link";
import { getMatchesForAdmin } from "@/lib/db/admin";
import AdminMatchesViewToggle from "@/components/admin/AdminMatchesViewToggle";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const;

const STATUS_FILTERS = [
  { value: "",          label: "Todos"      },
  { value: "scheduled", label: "Programados" },
  { value: "live",      label: "En vivo"    },
  { value: "finished",  label: "Finalizados" },
] as const;

interface PageProps {
  searchParams: Promise<{ group?: string; status?: string }>;
}

export default async function AdminMatchesPage({ searchParams }: PageProps) {
  const { group, status } = await searchParams;

  const matches = await getMatchesForAdmin({
    group:  group  || undefined,
    status: status || undefined,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
            Admin
          </p>
          <h1 className="text-2xl font-black text-[#f1f5f9]">Editor de partidos</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            {matches.length} partido{matches.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Link
            href="/admin"
            className="text-xs text-[#94a3b8] hover:text-[#94a3b8] transition-colors"
          >
            ← Admin
          </Link>
          <span className="text-[#2a2a45]">·</span>
          <Link
            href="/dashboard"
            className="text-xs text-[#94a3b8] hover:text-[#94a3b8] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">

        {/* Group filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest w-12 shrink-0">
            Grupo
          </span>
          <Link
            href={buildUrl(undefined, status)}
            className={filterClass(!group)}
          >
            Todos
          </Link>
          {GROUPS.map((g) => (
            <Link
              key={g}
              href={buildUrl(g, status)}
              className={filterClass(group === g)}
            >
              {g}
            </Link>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest w-12 shrink-0">
            Estado
          </span>
          {STATUS_FILTERS.map(({ value, label }) => (
            <Link
              key={value}
              href={buildUrl(group, value || undefined)}
              className={filterClass((!value && !status) || status === value)}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Calendario / Tarjetas toggle */}
      <AdminMatchesViewToggle matches={matches} />

      <div className="h-4" />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function buildUrl(group?: string, status?: string): string {
  const params = new URLSearchParams();
  if (group)  params.set("group",  group);
  if (status) params.set("status", status);
  const qs = params.toString();
  return `/admin/matches${qs ? `?${qs}` : ""}`;
}

function filterClass(active: boolean): string {
  return [
    "text-xs px-2.5 py-1 rounded-lg transition-colors font-medium",
    active
      ? "bg-[#00c85a]/15 text-[#00c85a] border border-[#00c85a]/25"
      : "bg-[#18182a] text-[#94a3b8] border border-[#2a2a45] hover:text-[#94a3b8]",
  ].join(" ");
}
