import { createClient } from "@/lib/supabase/server";
import type { GroupWithMeta } from "@/lib/groups";

/**
 * Returns the count of active (non-admin, non-disabled) players in a group.
 * Use this instead of raw group_members count for prize pool calculations.
 */
export async function getActivePlayerCount(groupId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_active_player_count", {
    p_group_id: groupId,
  });
  if (error) {
    console.error("[getActivePlayerCount]", error.message);
    return 0;
  }
  return (data as number) ?? 0;
}

/** Fast membership check — a single row lookup, no joins. */
export async function isGroupMember(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

type RawGroup = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  entry_fee:        number | null;
  first_place_pct:  number | null;
  second_place_pct: number | null;
  group_members: { count: number }[];
};

type DiagnoseResult = {
  uid: string | null;
  role: string;
  jwt_present: boolean;
};

/**
 * Returns all groups the user belongs to, enriched with member count and owner flag.
 * The SELECT is filtered by the groups RLS policy which uses get_user_group_ids(auth.uid()).
 * If auth.uid() is NULL in the PostgREST context, this will return an empty array even if
 * the user is a member — the diagnostic log below will reveal this scenario.
 */
export async function getUserGroupsWithMeta(
  userId: string
): Promise<GroupWithMeta[]> {
  const supabase = await createClient();

  // Diagnose PostgREST auth context — critical for understanding empty results
  const { data: diagData } = await supabase.rpc("diagnose_auth_context");
  const diag = diagData as DiagnoseResult | null;
  console.log("[getUserGroups] diagnose_auth_context →", {
    uid:         diag?.uid ?? null,
    role:        diag?.role ?? null,
    jwt_present: diag?.jwt_present ?? null,
    userId_prop: userId,
    uid_matches: diag?.uid === userId,
  });

  // Run groups query and ranks RPC in parallel
  const [groupsResult, ranksResult] = await Promise.all([
    supabase
      .from("groups")
      .select(`id, name, invite_code, owner_id, created_at, entry_fee, first_place_pct, second_place_pct, group_members(count)`)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_user_ranks_in_groups"),
  ]);

  if (groupsResult.error) {
    console.error("[getUserGroups] SELECT error:", {
      code:    groupsResult.error.code,
      message: groupsResult.error.message,
      hint:    groupsResult.error.hint,
    });
    return [];
  }

  if (ranksResult.error) {
    console.warn("[getUserGroups] get_user_ranks_in_groups error:", ranksResult.error.message);
  }

  const data = groupsResult.data;
  console.log("[getUserGroups] SELECT returned", data?.length ?? 0, "row(s)");

  // Build a map of group_id → user_rank
  type RankRow = { group_id: string; user_rank: number };
  const rankMap = new Map<string, number>();
  for (const row of ((ranksResult.data ?? []) as RankRow[])) {
    rankMap.set(row.group_id, Number(row.user_rank));
  }

  return (data as RawGroup[]).map((g) => ({
    id:               g.id,
    name:             g.name,
    invite_code:      g.invite_code,
    owner_id:         g.owner_id,
    created_at:       g.created_at,
    entry_fee:        g.entry_fee        ?? null,
    first_place_pct:  g.first_place_pct  ?? null,
    second_place_pct: g.second_place_pct ?? null,
    member_count:     g.group_members?.[0]?.count ?? 0,
    is_owner:         g.owner_id === userId,
    user_rank:        rankMap.get(g.id) ?? null,
  }));
}
