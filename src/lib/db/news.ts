import { createClient } from "@/lib/supabase/server";
import type { NewsContext } from "@/lib/news";

export type NewsWithMatch = {
  id:         string;
  match_id:   string;
  headline:   string;
  body:       string;
  image_type: string;
  created_at: string;
  home_name:  string;
  away_name:  string;
  home_flag:  string;
  away_flag:  string;
  home_score: number | null;
  away_score: number | null;
  stage:      string;
};

/** Returns the N most recent news posts, each joined with match + team display data. */
export async function getRecentNews(limit = 10): Promise<NewsWithMatch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("news")
    .select(
      `id, match_id, headline, body, image_type, created_at,
       match:match_id (
         stage, home_score, away_score,
         home_placeholder, away_placeholder,
         home_team:home_team_id ( name, flag_emoji ),
         away_team:away_team_id ( name, flag_emoji )
       )`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getRecentNews]", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = (row.match ?? {}) as any;
    const homeTeam = m.home_team ?? null;
    const awayTeam = m.away_team ?? null;

    return {
      id:         row.id         as string,
      match_id:   row.match_id   as string,
      headline:   row.headline   as string,
      body:       row.body       as string,
      image_type: row.image_type as string,
      created_at: row.created_at as string,
      home_name:  homeTeam?.name ?? m.home_placeholder ?? "Local",
      away_name:  awayTeam?.name ?? m.away_placeholder ?? "Visitante",
      home_flag:  homeTeam?.flag_emoji ?? "🏳️",
      away_flag:  awayTeam?.flag_emoji ?? "🏳️",
      home_score: m.home_score ?? null,
      away_score: m.away_score ?? null,
      stage:      m.stage ?? "group",
    };
  });
}

/** Fetches a single news post by id, joined with match + team display data. */
export async function getNewsById(id: string): Promise<NewsWithMatch | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("news")
    .select(
      `id, match_id, headline, body, image_type, created_at,
       match:match_id (
         stage, home_score, away_score,
         home_placeholder, away_placeholder,
         home_team:home_team_id ( name, flag_emoji ),
         away_team:away_team_id ( name, flag_emoji )
       )`
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getNewsById]", error.message);
    return null;
  }
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (data.match ?? {}) as any;
  const homeTeam = m.home_team ?? null;
  const awayTeam = m.away_team ?? null;

  return {
    id:         data.id         as string,
    match_id:   data.match_id   as string,
    headline:   data.headline   as string,
    body:       data.body       as string,
    image_type: data.image_type as string,
    created_at: data.created_at as string,
    home_name:  homeTeam?.name ?? m.home_placeholder ?? "Local",
    away_name:  awayTeam?.name ?? m.away_placeholder ?? "Visitante",
    home_flag:  homeTeam?.flag_emoji ?? "🏳️",
    away_flag:  awayTeam?.flag_emoji ?? "🏳️",
    home_score: m.home_score ?? null,
    away_score: m.away_score ?? null,
    stage:      m.stage ?? "group",
  };
}

/**
 * True only when `matchId` is Colombia's earliest match by `starts_at`.
 * Computed dynamically — never hardcode a match_id or date for this.
 */
async function isColombiaDebutMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
): Promise<boolean> {
  const { data: colombia } = await supabase
    .from("teams")
    .select("id")
    .eq("code", "COL")
    .maybeSingle();

  if (!colombia) return false;

  const { data: firstMatch } = await supabase
    .from("matches")
    .select("id")
    .or(`home_team_id.eq.${colombia.id},away_team_id.eq.${colombia.id}`)
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return firstMatch?.id === matchId;
}

/** Fetches the raw context object from Supabase for news generation. */
export async function getMatchNewsContext(matchId: string): Promise<NewsContext | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_match_news_context", {
    p_match_id: matchId,
  });

  if (error) {
    console.error("[getMatchNewsContext]", error.message);
    return null;
  }
  if (!data) return null;

  const is_colombia_debut = await isColombiaDebutMatch(supabase, matchId);

  return { ...(data as NewsContext), is_colombia_debut };
}
