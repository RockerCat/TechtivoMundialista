import { Users } from "lucide-react";
import GroupCard from "./GroupCard";
import GroupActions from "./GroupActions";
import { getUserGroupsWithMeta } from "@/lib/db/groups";
import type { GroupWithMeta } from "@/lib/groups";

interface GroupsSectionProps {
  userId: string;
}

export default async function GroupsSection({ userId }: GroupsSectionProps) {
  const groups = await getUserGroupsWithMeta(userId);

  if (groups.length === 0) {
    return <EmptyState />;
  }

  return <GroupList groups={groups} />;
}

/* ── No groups yet ──────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/10 flex items-center justify-center shrink-0">
          <Users size={18} className="text-[#38BDF8]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#f1f5f9] mb-1">
            Aún no tienes un grupo
          </p>
          <p className="text-xs text-[#94a3b8] leading-relaxed">
            Crea tu propio grupo o pídele a un amigo que te comparta su código
            de invitación.
          </p>
        </div>
      </div>
      <GroupActions variant="empty" />
    </div>
  );
}

/* ── User has groups ────────────────────────────────────────────────── */

function GroupList({ groups }: { groups: GroupWithMeta[] }) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}

      {/* Secondary actions below the list */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-[#64748b]">
          {groups.length === 1 ? "1 grupo" : `${groups.length} grupos`}
        </p>
        <GroupActions variant="compact" />
      </div>
    </div>
  );
}
