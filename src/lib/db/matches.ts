import { createClient } from "@/lib/supabase/server";
import type { Match, Prediction, MatchWithPrediction } from "@/lib/matches";

export type MatchPredictionEntry = {
  user_id:       string;
  display_name:  string;
  pred_home:     number;
  pred_away:     number;
  points:        number;
  points_reason: string | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: Match["home_team"];
  away_team: Match["away_team"];
};

/**
 * Fetches all matches (with joined teams) and the current user's predictions,
 * then merges them into a single list ordered by kickoff time.
 *
 * The matches/teams SELECT uses simple RLS (TO authenticated USING true).
 * The predictions SELECT uses auth.uid() = user_id — may return empty if the
 * JWT doesn't reach PostgREST (acceptable: user can still save predictions via
 * the save_prediction_for_user SECURITY DEFINER function).
 */
export async function getMatchesWithPredictions(
  userId: string
): Promise<MatchWithPrediction[]> {
  const supabase = await createClient();

  // Fetch matches with home/away team data in one query
  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select(
      `*,
       home_team:home_team_id(*),
       away_team:away_team_id(*)`
    )
    .order("starts_at", { ascending: true });

  if (matchError) {
    console.error("[getMatches] SELECT error:", matchError.message, matchError.code);
    return [];
  }

  console.log("[getMatches] fetched", matchRows?.length ?? 0, "matches");

  if (!matchRows || matchRows.length === 0) return [];

  // Fetch user's predictions (may be empty if JWT issue — non-fatal)
  const { data: predRows, error: predError } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", userId);

  if (predError) {
    console.warn("[getMatches] predictions SELECT error:", predError.message);
  }

  console.log("[getMatches] fetched", predRows?.length ?? 0, "predictions");

  const predMap = new Map<string, Prediction>(
    (predRows ?? []).map((p) => [p.match_id as string, p as Prediction])
  );

  return (matchRows as RawMatch[]).map((m) => ({
    ...m,
    prediction: predMap.get(m.id) ?? null,
  }));
}

/**
 * Transitions any overdue 'scheduled' match to 'live'.
 * Idempotent and non-fatal: errors are logged but do not block page renders.
 * Must be called server-side (uses Supabase server client).
 */
export async function syncStartedMatches(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("sync_started_matches");
  if (error) {
    console.warn("[syncStartedMatches]", error.message);
  }
}

export async function getMatchDetailPredictions(
  matchId: string,
  groupId: string
): Promise<MatchPredictionEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_match_detail_predictions", {
    p_match_id: matchId,
    p_group_id: groupId,
  });
  if (error) {
    console.error("[matches] getMatchDetailPredictions:", error.message);
    return [];
  }
  return (data ?? []) as MatchPredictionEntry[];
}
