import { cn } from "@/lib/utils";
import { type ActivityEntry, formatRelativeDate } from "@/lib/groups";

interface ActivityFeedProps {
  entries: ActivityEntry[];
  currentUserId: string;
}

export default function ActivityFeed({ entries, currentUserId }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-6 text-center">
        <p className="text-2xl mb-2">📋</p>
        <p className="text-xs text-[#94a3b8]">
          Aún no hay actividad. Los eventos aparecen cuando el admin confirma resultados.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, i) => (
        <ActivityItem
          key={`${entry.user_id}-${entry.scored_at}-${i}`}
          entry={entry}
          isCurrentUser={entry.user_id === currentUserId}
        />
      ))}
    </div>
  );
}

function ActivityItem({
  entry,
  isCurrentUser,
}: {
  entry: ActivityEntry;
  isCurrentUser: boolean;
}) {
  const isExact = entry.points_reason === "Marcador exacto";
  const displayName = isCurrentUser ? "Tú" : entry.display_name;
  const avatarLetter = entry.display_name.charAt(0).toUpperCase();

  return (
    <div className="flex items-start gap-3 bg-[#18182a] border border-[#2a2a45] rounded-2xl px-4 py-3">
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
          isCurrentUser
            ? "bg-[#38BDF8]/20 text-[#38BDF8]"
            : "bg-[#1e1e35] text-[#94a3b8]"
        )}
      >
        {avatarLetter}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name + action */}
        <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
          <span
            className={cn(
              "text-sm font-bold",
              isCurrentUser ? "text-[#38BDF8]" : "text-[#f1f5f9]"
            )}
          >
            {displayName}
          </span>
          <span className="text-xs text-[#94a3b8]">
            {isExact ? "acertó el marcador exacto" : "acertó el resultado"}
          </span>
        </div>

        {/* Match */}
        <p className="text-xs text-[#94a3b8] mb-1">
          {entry.home_team_flag ? `${entry.home_team_flag} ` : ""}
          {entry.home_team_name}{" "}
          <span className="font-mono font-bold text-[#f1f5f9]">
            {entry.match_home_score}–{entry.match_away_score}
          </span>{" "}
          {entry.away_team_name}
          {entry.away_team_flag ? ` ${entry.away_team_flag}` : ""}
        </p>

        {/* Time */}
        <p className="text-[10px] text-[#64748b]">
          {formatRelativeDate(entry.scored_at)}
        </p>
      </div>

      {/* Points badge */}
      <div className="shrink-0 text-right">
        <span
          className={cn(
            "text-sm font-black tabular-nums",
            isExact ? "text-[#f59e0b]" : "text-[#38BDF8]"
          )}
        >
          +{entry.points}
        </span>
        <p className="text-[10px] text-[#64748b] font-mono">pts</p>
      </div>
    </div>
  );
}
