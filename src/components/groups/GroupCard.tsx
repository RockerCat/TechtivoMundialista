import Link from "next/link";
import { Crown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import CopyButton from "./CopyButton";
import CopyInviteLinkButton from "./CopyInviteLinkButton";
import { formatMemberCount, formatRelativeDate, type GroupWithMeta } from "@/lib/groups";

export default function GroupCard({ group }: { group: GroupWithMeta }) {
  return (
    <div
      className={cn(
        "relative bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4 transition-all duration-200 cursor-pointer",
        "hover:border-[#00c85a]/25 hover:shadow-[0_0_20px_rgba(0,200,90,0.06)]"
      )}
    >
      {/* Overlay link — covers entire card, below z-10 content */}
      <Link
        href={`/groups/${group.id}`}
        className="absolute inset-0 rounded-2xl z-0"
        aria-label={`Ver grupo ${group.name}`}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base leading-none">⚽</span>
            <h3 className="text-sm font-bold text-[#f1f5f9] truncate">
              {group.name}
            </h3>
          </div>
          <p className="text-xs text-[#64748b]">
            Creado {formatRelativeDate(group.created_at)}
          </p>
        </div>

        {group.is_owner && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-semibold shrink-0">
            <Crown size={10} />
            Admin
          </span>
        )}
      </div>

      {/* Member count + rank preview */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
          <Users size={13} strokeWidth={1.8} />
          <span>{formatMemberCount(group.member_count)}</span>
        </div>

        {group.member_count > 1 && group.user_rank !== null && (
          <span
            className={cn(
              "text-xs font-mono font-bold",
              group.user_rank === 1 ? "text-[#f59e0b]" : "text-[#64748b]"
            )}
          >
            {group.user_rank === 1 ? "🔥 " : ""}#{group.user_rank} de {group.member_count}
          </span>
        )}
      </div>

      {/* Share row — z-10 so buttons receive clicks above the overlay link */}
      <div className="relative z-10 flex items-center gap-2 pt-3 border-t border-[#1e1e35]">
        <CopyButton text={group.invite_code} />
        <CopyInviteLinkButton inviteCode={group.invite_code} />
      </div>
    </div>
  );
}
