import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/db/admin";
import {
  computeGroupStandings,
  computeBestThirds,
  type ClassificationMatch,
  type KnockoutPreviewMatch,
} from "@/lib/classification";
import ClassificationTabs from "@/components/admin/ClassificationTabs";

export default async function ClassificationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) notFound();

  const [{ data: groupMatchData }, { data: knockoutData }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "group_code, home_score, away_score, status, " +
        "home_team:home_team_id(id, name, code, flag_emoji), " +
        "away_team:away_team_id(id, name, code, flag_emoji)"
      )
      .eq("stage", "group_stage"),
    supabase
      .from("matches")
      .select(
        "id, match_number, starts_at, home_placeholder, away_placeholder, " +
        "home_team:home_team_id(id, name, code, flag_emoji), " +
        "away_team:away_team_id(id, name, code, flag_emoji)"
      )
      .eq("stage", "round_of_32")
      .order("match_number", { ascending: true }),
  ]);

  const groupMatches = (groupMatchData ?? []) as unknown as ClassificationMatch[];
  const groups       = computeGroupStandings(groupMatches);
  const bestThirds   = computeBestThirds(groups);
  const roundOf32    = (knockoutData ?? []) as unknown as KnockoutPreviewMatch[];

  const finishedCount = groupMatches.filter((m) => m.status === "finished").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      <div>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
          Admin · Clasificación
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Clasificación de Grupos</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          Solo lectura · {finishedCount} partido{finishedCount !== 1 ? "s" : ""} finalizado{finishedCount !== 1 ? "s" : ""}
        </p>
      </div>

      <ClassificationTabs
        groups={groups}
        bestThirds={bestThirds}
        roundOf32={roundOf32}
      />

    </div>
  );
}
