import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeGroupStandings,
  computeBestThirds,
  type ClassificationMatch,
  type KnockoutPreviewMatch,
} from "@/lib/classification";
import { projectKnockoutBracket } from "@/lib/bracket";
import CopaTabs from "@/components/copa/CopaTabs";
import TabReadyBeacon from "@/components/layout/TabReadyBeacon";

export const metadata = { title: "Copa · Techtivo" };

const KNOCKOUT_SELECT =
  "id, match_number, starts_at, venue, status, home_score, away_score, advancing_team_id, " +
  "home_placeholder, away_placeholder, " +
  "home_team:home_team_id(id, name, code, flag_emoji), " +
  "away_team:away_team_id(id, name, code, flag_emoji)";

function detectDefaultTab(
  groupMatches: ClassificationMatch[],
  r32: KnockoutPreviewMatch[],
  r16: KnockoutPreviewMatch[],
  qf:  KnockoutPreviewMatch[],
  sf:  KnockoutPreviewMatch[],
): string {
  if (groupMatches.some((m) => m.status !== "finished")) return "groups";
  if (r32.some((m) => m.status !== "finished")) return "r32";
  if (r16.some((m) => m.status !== "finished")) return "r16";
  if (qf.some((m)  => m.status !== "finished")) return "qf";
  if (sf.some((m)  => m.status !== "finished")) return "sf";
  return "final";
}

export default async function CopaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: groupMatchData },
    { data: r32Data },
    { data: r16Data },
    { data: qfData },
    { data: sfData },
    { data: thirdPlaceData },
    { data: finalData },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "group_code, home_score, away_score, status, " +
        "home_team:home_team_id(id, name, code, flag_emoji), " +
        "away_team:away_team_id(id, name, code, flag_emoji)"
      )
      .eq("stage", "group"),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "round_of_32").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "round_of_16").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "quarter_final").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "semi_final").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "third_place").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "final").order("match_number", { ascending: true }),
  ]);

  const groupMatches = (groupMatchData  ?? []) as unknown as ClassificationMatch[];
  const r32          = (r32Data         ?? []) as unknown as KnockoutPreviewMatch[];
  const r16          = (r16Data         ?? []) as unknown as KnockoutPreviewMatch[];
  const qf           = (qfData          ?? []) as unknown as KnockoutPreviewMatch[];
  const sf           = (sfData          ?? []) as unknown as KnockoutPreviewMatch[];
  const thirdPlace   = (thirdPlaceData  ?? []) as unknown as KnockoutPreviewMatch[];
  const finals       = (finalData       ?? []) as unknown as KnockoutPreviewMatch[];

  const groups     = computeGroupStandings(groupMatches);
  const bestThirds = computeBestThirds(groups);
  const defaultTab = detectDefaultTab(groupMatches, r32, r16, qf, sf);

  const bracket = projectKnockoutBracket({
    groups, bestThirds,
    roundOf32: r32, roundOf16: r16, quarterFinals: qf, semiFinals: sf,
    thirdPlace, finals,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <TabReadyBeacon tabId="copa" />
      <div>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Camino a la Copa</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Mundial FIFA 2026</p>
      </div>

      <CopaTabs
        groups={groups}
        bestThirds={bestThirds}
        roundOf32={bracket.roundOf32}
        roundOf16={bracket.roundOf16}
        quarterFinals={bracket.quarterFinals}
        semiFinals={bracket.semiFinals}
        thirdPlace={bracket.thirdPlace}
        finals={bracket.finals}
        defaultTab={defaultTab}
      />
    </div>
  );
}
