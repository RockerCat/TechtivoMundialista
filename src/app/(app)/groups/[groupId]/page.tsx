import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGroupLeaderboard, getGroupActivity } from "@/lib/db/leaderboard";
import { isUserDisabled } from "@/lib/db/admin";
import { getActivePlayerCount } from "@/lib/db/groups";
import { getRecentNews } from "@/lib/db/news";
import MemberList from "@/components/groups/MemberList";
import GroupStats from "@/components/groups/GroupStats";
import ActivityFeed from "@/components/groups/ActivityFeed";
import NewsFeed from "@/components/groups/NewsFeed";
import CopyButton from "@/components/groups/CopyButton";
import CopyInviteLinkButton from "@/components/groups/CopyInviteLinkButton";
import TabReadyBeacon from "@/components/layout/TabReadyBeacon";
import {
  formatMemberCount,
  formatRelativeDate,
  formatCOP,
  type MemberDetail,
  type LeaderboardEntry,
  FIXED_FIRST_PRIZE,
  FIXED_SECOND_PRIZE,
} from "@/lib/groups";

type RawGroup = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
};

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isUserDisabled(user.id)) redirect("/disabled");

  // RLS enforces membership — returns null if user is not a member
  const { data: rawGroup } = await supabase
    .from("groups")
    .select("id, name, invite_code, owner_id, created_at")
    .eq("id", groupId)
    .single();

  if (!rawGroup) redirect("/dashboard");

  const group = rawGroup as RawGroup;
  const isOwner = group.owner_id === user.id;

  // Parallel fetch: leaderboard, activity, member join dates, match counts, active player count, news
  const [leaderboard, activity, membersResult, matchesResult, activePlayers, recentNews] = await Promise.all([
    getGroupLeaderboard(groupId),
    getGroupActivity(groupId),
    supabase
      .from("group_members")
      .select("user_id, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true }),
    supabase.from("matches").select("status"),
    getActivePlayerCount(groupId),
    getRecentNews(3),
  ]);

  // Derive members: names come from leaderboard, join dates from group_members.
  // Filter to active users only (leaderboard already excludes admin + disabled),
  // so memberCount stays consistent with the leaderboard participant count.
  const nameMap = new Map(leaderboard.map((e) => [e.user_id, e.display_name]));
  const members: MemberDetail[] = (membersResult.data ?? [])
    .filter((r) => nameMap.has(r.user_id as string))
    .map((r) => ({
      user_id:      r.user_id as string,
      display_name: nameMap.get(r.user_id as string)!,
      is_owner:     (r.user_id as string) === group.owner_id,
      joined_at:    r.joined_at as string,
    }));

  // Match stats
  const allMatches     = matchesResult.data ?? [];
  const scoredMatches  = allMatches.filter((m) => m.status === "finished").length;
  const pendingMatches = allMatches.filter((m) => m.status !== "finished").length;

  // Group stats
  const totalPredictions = leaderboard.reduce((sum, e) => sum + e.pred_count, 0);

  // Current user context
  const userEntry = leaderboard.find((e) => e.user_id === user.id);
  const isLeading =
    !!userEntry &&
    userEntry.rank === 1 &&
    leaderboard.length > 1 &&
    userEntry.total_points > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <TabReadyBeacon tabId="community" />

      {/* Back link */}
      <Link
        href="/dashboard"
        className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors inline-flex items-center gap-1"
      >
        ← Inicio
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl font-black text-[#f1f5f9]">{group.name}</h1>
          {isOwner && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-semibold">
              <Crown size={10} />
              Admin
            </span>
          )}
          {isLeading && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-xs font-semibold">
              🔥 Liderando
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
          <Users size={13} strokeWidth={1.8} />
          <span>{formatMemberCount(activePlayers)}</span>
          <span className="text-[#2a2a45]">·</span>
          <span>Creado {formatRelativeDate(group.created_at)}</span>
        </div>
      </div>

      {/* Invite link — admin only */}
      {isOwner && (
        <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4">
          <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-3">
            Invitar miembros
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black text-[#f1f5f9] tracking-[0.2em]">
              {group.invite_code}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <CopyButton text={group.invite_code} />
              <CopyInviteLinkButton inviteCode={group.invite_code} />
            </div>
          </div>
        </div>
      )}

      {/* 1. Últimas noticias */}
      <section>
        <SectionHeader title="Últimas noticias" />
        <NewsFeed items={recentNews} />
        {recentNews.length > 0 && (
          <Link
            href="/noticias"
            className="mt-3 inline-flex items-center gap-1 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
          >
            Ver todas las noticias →
          </Link>
        )}
      </section>

      {/* 2. Resumen del grupo */}
      <section>
        <SectionHeader title="Resumen" />
        <GroupStats
          memberCount={activePlayers}
          totalPredictions={Number(totalPredictions)}
          scoredMatches={scoredMatches}
          pendingMatches={pendingMatches}
          leaderName={null}
        />
      </section>

      {/* 3. Líder actual */}
      <section>
        <SectionHeader title="Líder actual" />
        <LeaderCard leaderboard={leaderboard} currentUserId={user.id} />
      </section>

      {/* 4. Premios proyectados */}
      <section>
        <SectionHeader title="Premios proyectados" />
        <PrizeSummary leaderboard={leaderboard} />
      </section>

      {/* 5. Miembros */}
      <section>
        <SectionHeader title="Miembros" count={members.length} />
        <MemberList members={members} currentUserId={user.id} />
      </section>

      {/* 6. Actividad reciente */}
      <section>
        <SectionHeader
          title="Actividad reciente"
          count={activity.length > 0 ? activity.length : undefined}
        />
        <ActivityFeed entries={activity} currentUserId={user.id} />
      </section>

      {/* Tabla link — full leaderboard lives at /leaderboard */}
      <Link
        href="/leaderboard"
        className="flex items-center justify-between gap-2 rounded-2xl border border-[#1e1e35] bg-[#11111c] px-4 py-3.5 hover:border-[#2a2a45] transition-all group"
      >
        <span className="text-sm text-[#94a3b8] group-hover:text-[#f1f5f9] transition-colors">
          Ver tabla completa
        </span>
        <span className="text-xs text-[#475569] group-hover:text-[#64748b] transition-colors">
          {leaderboard.length} participante{leaderboard.length !== 1 ? "s" : ""} →
        </span>
      </Link>

      <div className="h-4" />
    </div>
  );
}

// ── Líder actual ──────────────────────────────────────────────────────

function LeaderCard({
  leaderboard,
  currentUserId,
}: {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}) {
  const allZero = leaderboard.length === 0 || leaderboard.every((e) => e.total_points === 0);

  if (allZero) {
    return (
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-4 text-center">
        <p className="text-xs text-[#475569]">
          El liderato se definirá cuando haya puntos registrados.
        </p>
      </div>
    );
  }

  const first  = leaderboard[0];
  const second = leaderboard[1] ?? null;
  const isMe   = first.user_id === currentUserId;
  const tied   = second !== null && second.total_points === first.total_points;
  const gap    = second !== null && !tied ? first.total_points - second.total_points : null;

  return (
    <div className="bg-[#11111c] border border-[#f59e0b]/20 rounded-2xl p-4 flex items-center gap-4">
      <span className="text-2xl leading-none shrink-0">🥇</span>
      <div className="flex-1 min-w-0">
        <p className={`text-base font-black truncate ${isMe ? "text-[#38BDF8]" : "text-[#f1f5f9]"}`}>
          {first.display_name}
          {isMe && (
            <span className="text-[10px] text-[#38BDF8]/60 font-mono ml-1.5">tú</span>
          )}
        </p>
        {tied && second && (
          <p className="text-[11px] text-[#64748b] mt-0.5">
            Empate con {second.display_name}
          </p>
        )}
        {gap !== null && second && (
          <p className="text-[11px] text-[#64748b] mt-0.5">
            {gap} pt{gap !== 1 ? "s" : ""} de ventaja sobre {second.display_name}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-2xl font-black text-[#f59e0b] tabular-nums leading-none">
          {first.total_points}
        </p>
        <p className="text-[10px] text-[#64748b]">pts</p>
      </div>
    </div>
  );
}

// ── Premios proyectados ───────────────────────────────────────────────

function PrizeSummary({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const allZero = leaderboard.every((e) => e.total_points === 0);
  const rank1   = allZero ? [] : leaderboard.filter((e) => e.rank === 1);
  const rank2   = allZero ? [] : leaderboard.filter((e) => e.rank === 2);

  const firstSplit   = rank1.length > 1;
  const firstNames   = rank1.map((e) => e.display_name);
  const firstAmount  = rank1.length > 1
    ? Math.round(FIXED_FIRST_PRIZE / rank1.length)
    : rank1.length === 1 ? FIXED_FIRST_PRIZE : null;

  const showSecond   = rank1.length <= 1;
  const secondSplit  = showSecond && rank2.length > 1;
  const secondNames  = showSecond ? rank2.map((e) => e.display_name) : [];
  const secondAmount = showSecond && rank2.length > 1
    ? Math.round(FIXED_SECOND_PRIZE / rank2.length)
    : showSecond && rank2.length === 1 ? FIXED_SECOND_PRIZE : null;

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#22c55e]/80 font-semibold">Patrocinados por Techtivo · Inscripción gratis</span>
      </div>
      <div className="border-t border-[#1e1e35] pt-3 space-y-2">
        {/* 1st prize */}
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🥇</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#64748b]">1er lugar</p>
            {firstNames.length > 0 && (
              <p className="text-xs font-semibold text-[#94a3b8] truncate">{firstNames.join(", ")}</p>
            )}
            {firstSplit && (
              <p className="text-[10px] text-[#64748b]">Dividido por empate</p>
            )}
          </div>
          <span className={`text-sm font-black tabular-nums shrink-0 ${firstAmount !== null ? "text-[#f59e0b]" : "text-[#f59e0b]/40"}`}>
            {firstAmount !== null ? formatCOP(firstAmount) : formatCOP(FIXED_FIRST_PRIZE)}
          </span>
        </div>
        {/* 2nd prize */}
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🥈</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#64748b]">2do lugar</p>
            {secondNames.length > 0 && (
              <p className="text-xs font-semibold text-[#94a3b8] truncate">{secondNames.join(", ")}</p>
            )}
            {secondSplit && (
              <p className="text-[10px] text-[#64748b]">Dividido por empate</p>
            )}
          </div>
          <span className={`text-sm font-black tabular-nums shrink-0 ${secondAmount !== null ? "text-[#94a3b8]" : "text-[#94a3b8]/40"}`}>
            {secondAmount !== null ? formatCOP(secondAmount) : formatCOP(FIXED_SECOND_PRIZE)}
          </span>
        </div>
      </div>
      {allZero && (
        <p className="text-[10px] text-[#64748b] leading-relaxed border-t border-[#1e1e35] pt-3">
          Los premios proyectados aparecerán cuando haya resultados puntuados.
        </p>
      )}
      <p className="text-[10px] text-[#475569] leading-relaxed border-t border-[#1e1e35] pt-3">
        Premios fijos patrocinados por Techtivo. No dependen del número de participantes.
      </p>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wide">
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-xs bg-[#18182a] border border-[#2a2a45] text-[#94a3b8] px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}
