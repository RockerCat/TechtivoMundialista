import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry, ActivityEntry } from "@/lib/groups";

type RawEntry = {
  user_id:      string;
  display_name: string;
  total_points: number | string;
  exact_count:  number | string;
  result_count: number | string;
  pred_count:   number | string;
  rank:         number | string;
};

export async function getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_group_leaderboard", {
    p_group_id: groupId,
  });

  if (error) {
    console.error("[leaderboard] getGroupLeaderboard:", error.code, error.message);
    return [];
  }

  return ((data ?? []) as RawEntry[]).map((row) => ({
    user_id:      row.user_id,
    display_name: row.display_name,
    total_points: Number(row.total_points),
    exact_count:  Number(row.exact_count),
    result_count: Number(row.result_count),
    pred_count:   Number(row.pred_count),
    rank:         Number(row.rank),
  }));
}

export async function getGroupActivity(
  groupId: string,
  limit = 10
): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_group_recent_activity", {
    p_group_id: groupId,
    p_limit: limit,
  });
  if (error) {
    console.error("[leaderboard] getGroupActivity:", error.message);
    return [];
  }
  return (data ?? []) as ActivityEntry[];
}
