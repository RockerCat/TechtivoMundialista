// ──────────────────────────────────────────────────────────────────────
// Invite code generation
// Uses an unambiguous alphabet: no 0/O, no 1/I/L
// ──────────────────────────────────────────────────────────────────────
const INVITE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 6): string {
  return Array.from(
    { length },
    () => INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]
  ).join("");
}

// ──────────────────────────────────────────────────────────────────────
// DB row types (mirror the SQL schema exactly)
// ──────────────────────────────────────────────────────────────────────

export type GroupRow = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  entry_fee:        number | null;
  first_place_pct:  number | null;
  second_place_pct: number | null;
};

export type GroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
};

// ──────────────────────────────────────────────────────────────────────
// Enriched type used in the dashboard
// ──────────────────────────────────────────────────────────────────────

export type GroupWithMeta = GroupRow & {
  member_count: number;
  is_owner: boolean;
  user_rank: number | null;
};

export type MemberDetail = {
  user_id: string;
  display_name: string;
  is_owner: boolean;
  joined_at: string;
};

export type ActivityEntry = {
  user_id: string;
  display_name: string;
  pred_home: number;
  pred_away: number;
  points: number;
  points_reason: string;
  scored_at: string;
  match_home_score: number;
  match_away_score: number;
  home_team_name: string;
  home_team_flag: string | null;
  away_team_name: string;
  away_team_flag: string | null;
  match_stage: string;
};

// ──────────────────────────────────────────────────────────────────────
// Server Action result types
// ──────────────────────────────────────────────────────────────────────

export type GroupActionResult =
  | {
      error: string;
      /** Full Supabase error detail — only populated in development */
      devMessage?: string;
    }
  | { success: true; group: Pick<GroupRow, "id" | "name" | "invite_code"> };

export type GroupActionState = GroupActionResult | null;

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

export function formatMemberCount(n: number): string {
  return n === 1 ? "1 miembro" : `${n} miembros`;
}

// ──────────────────────────────────────────────────────────────────────
// Fixed prizes — sponsored by Techtivo, not based on participant count
// ──────────────────────────────────────────────────────────────────────

export const FIXED_FIRST_PRIZE  = 750_000;
export const FIXED_SECOND_PRIZE = 250_000;

// ──────────────────────────────────────────────────────────────────────
// Prize pool helpers
// ──────────────────────────────────────────────────────────────────────

/** Colombian peso formatting: $300.000 */
export function formatCOP(amount: number): string {
  return "$" + Math.round(amount).toLocaleString("es-CO");
}

/** Compact COP for narrow spaces: $50K, $300K, $1.5M */
export function formatCompactCOP(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return formatCOP(amount);
}

export type PrizeConfig = {
  entry_fee:        number;
  first_place_pct:  number;
  second_place_pct: number;
};

export type PrizePool = {
  config:       PrizeConfig;
  member_count: number;
  total:        number;
  first_prize:  number;
  second_prize: number;
};

/** Returns null when entry_fee is 0 / not configured. */
export function computePrizePool(
  config: PrizeConfig,
  memberCount: number
): PrizePool | null {
  if (!config.entry_fee || config.entry_fee <= 0) return null;
  const total        = config.entry_fee * memberCount;
  const first_prize  = Math.round(total * config.first_place_pct  / 100);
  const second_prize = Math.round(total * config.second_place_pct / 100);
  return { config, member_count: memberCount, total, first_prize, second_prize };
}

// ──────────────────────────────────────────────────────────────────────
// Leaderboard
// ──────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  total_points: number;
  exact_count: number;
  result_count: number;
  pred_count: number;
  rank: number;
};

// ──────────────────────────────────────────────────────────────────────
// Projected prize distribution with tie handling
// ──────────────────────────────────────────────────────────────────────

export type ProjectedPrize = {
  /** Per-player share, or null when no prize (pre-tournament or outside top 2). */
  amount:  number | null;
  /** True when this amount is a per-player split among tied players. */
  isSplit: boolean;
};

/**
 * Returns a per-user map of projected prize amounts.
 *
 * - All players at 0 pts → every entry gets { amount: null } (pre-tournament).
 * - Tie for 1st → first_prize divided equally; no 2nd prize assigned
 *   (SQL RANK() skips rank 2 when rank 1 has multiple players).
 * - Tie for 2nd → second_prize divided equally; 1st gets full amount.
 * - Outside 1st / 2nd → { amount: null }.
 */
export function computeProjectedPrizes(
  pool:    PrizePool,
  entries: LeaderboardEntry[]
): Map<string, ProjectedPrize> {
  const prizes = new Map<string, ProjectedPrize>();
  const none: ProjectedPrize = { amount: null, isSplit: false };

  // Pre-tournament: all zeros → no projections
  if (entries.every((e) => e.total_points === 0)) {
    for (const e of entries) prizes.set(e.user_id, none);
    return prizes;
  }

  const rank1 = entries.filter((e) => e.rank === 1);
  const rank2 = entries.filter((e) => e.rank === 2);

  if (rank1.length > 1) {
    // Tie for 1st: split first_prize; SQL RANK skips rank 2, so no 2nd prize
    const share = Math.round(pool.first_prize / rank1.length);
    for (const e of entries) {
      prizes.set(e.user_id, e.rank === 1 ? { amount: share, isSplit: true } : none);
    }
  } else {
    if (rank1[0]) prizes.set(rank1[0].user_id, { amount: pool.first_prize, isSplit: false });
    if (rank2.length > 1) {
      // Tie for 2nd: split second_prize equally
      const share = Math.round(pool.second_prize / rank2.length);
      for (const e of rank2) prizes.set(e.user_id, { amount: share, isSplit: true });
    } else if (rank2[0]) {
      prizes.set(rank2[0].user_id, { amount: pool.second_prize, isSplit: false });
    }
    for (const e of entries) {
      if (!prizes.has(e.user_id)) prizes.set(e.user_id, none);
    }
  }

  return prizes;
}

export function formatRelativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem.`;
  return `hace ${Math.floor(days / 30)} meses`;
}
