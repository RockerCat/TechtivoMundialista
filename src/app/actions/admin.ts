"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/db/admin";
import { getMatchNewsContext } from "@/lib/db/news";
import { buildHeadline, buildBody, selectImageType } from "@/lib/news";

// ── Types ─────────────────────────────────────────────────────────────

export type ToggleUserState    = { error: string } | { success: true } | null;
export type UpdateMatchState   = { error: string } | { success: true; scored: number } | null;
export type UpdateFixtureState = { error: string } | { success: true } | null;
export type UpdatePrizeState   = { error: string } | { success: true } | null;
export type AdvancedEditState  = { error: string } | { success: true; scored: number } | null;
export type RecalculateState   =
  | { error: string }
  | { success: true; matches_processed: number; predictions_scored: number }
  | null;
export type SnapshotState =
  | { error: string }
  | { success: true; snapshot: Record<string, unknown> }
  | null;

export type MatchPrediction = {
  user_id:       string;
  display_name:  string;
  home_score:    number;
  away_score:    number;
  points:        number | null;
  points_reason: string | null;
  submitted_at:  string;
  updated_at:    string;
};

export type MissingPredictionUser = {
  user_id:      string;
  display_name: string;
};

type AdminUserListRow = {
  user_id:     string;
  display_name: string;
  is_disabled: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Write to admin_match_audit (match-specific legacy audit) */
async function writeMatchAudit(
  supabase: SupabaseClient,
  payload: {
    match_id:   string;
    admin_id:   string;
    action:     "update_result" | "update_fixture";
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown>;
  }
) {
  void supabase.from("admin_match_audit").insert(payload);
}

/** Write to admin_activity_log (general audit, any entity) */
async function writeActivity(
  supabase: SupabaseClient,
  payload: {
    admin_id:     string;
    action:       string;
    entity_type:  string;
    entity_id:    string;
    entity_label?: string;
    old_values?:  Record<string, unknown> | null;
    new_values?:  Record<string, unknown>;
  }
) {
  void supabase.from("admin_activity_log").insert(payload);
}

// ── getMatchPredictionsAction ─────────────────────────────────────────
// Read-only: returns all predictions for a single match for admin view.

export async function getMatchPredictionsAction(
  matchId: string
): Promise<{ predictions?: MatchPrediction[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_match_predictions", {
    p_match_id: matchId,
  });
  if (error) return { error: error.message };
  return { predictions: (data ?? []) as MatchPrediction[] };
}

// ── getMatchMissingPredictionsAction ──────────────────────────────────
// Read-only: active, non-admin group members who have not yet submitted
// a prediction for this match. Built entirely from existing RPCs —
// get_admin_user_list (active roster) minus get_match_predictions
// (who already predicted). No new tables, RLS, or migrations.

export async function getMatchMissingPredictionsAction(
  matchId: string
): Promise<{ users?: MissingPredictionUser[]; error?: string }> {
  const supabase = await createClient();

  const [predictionsRes, usersRes] = await Promise.all([
    supabase.rpc("get_match_predictions", { p_match_id: matchId }),
    supabase.rpc("get_admin_user_list"),
  ]);

  if (predictionsRes.error) return { error: predictionsRes.error.message };
  if (usersRes.error)       return { error: usersRes.error.message };

  const predictedUserIds = new Set(
    ((predictionsRes.data ?? []) as MatchPrediction[]).map((p) => p.user_id)
  );

  // get_admin_user_list already excludes admins; we only need to drop
  // disabled users and anyone who already predicted.
  const missing = ((usersRes.data ?? []) as AdminUserListRow[])
    .filter((u) => !u.is_disabled && !predictedUserIds.has(u.user_id))
    .map((u) => ({ user_id: u.user_id, display_name: u.display_name }));

  return { users: missing };
}

// ── recalculateAllScoresAction ────────────────────────────────────────
// Re-runs scoring for every finished match. Idempotent.

export async function recalculateAllScoresAction(
  _prev: RecalculateState
): Promise<RecalculateState> {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "No autenticado." };
  if (!(await isAdmin(user.id))) return { error: "Sin permisos de administrador." };

  const { data, error } = await supabase.rpc("recalculate_all_scores");
  if (error) {
    const msg = error.message;
    if (msg === "not_admin") return { error: "Sin permisos de administrador." };
    return { error: `Error al recalcular: ${msg}` };
  }

  const result = data as { matches_processed: number; predictions_scored: number };

  void writeActivity(supabase, {
    admin_id:     user.id,
    action:       "recalculate_scores",
    entity_type:  "system",
    entity_id:    user.id,
    entity_label: `${result.matches_processed} partidos · ${result.predictions_scored} predicciones`,
    new_values:   result,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/ranking");
  revalidatePath("/dashboard");
  return { success: true, ...result };
}

// ── getAdminSnapshotAction ────────────────────────────────────────────
// Read-only JSON export of every functional table, for manual backup.
// No restore path; no passwords, secrets or tokens are included.

export async function getAdminSnapshotAction(): Promise<SnapshotState> {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "No autenticado." };
  if (!(await isAdmin(user.id))) return { error: "Sin permisos de administrador." };

  const { data, error } = await supabase.rpc("get_admin_snapshot");
  if (error) {
    const msg = error.message;
    if (msg === "not_admin") return { error: "Sin permisos de administrador." };
    return { error: `Error al generar el snapshot: ${msg}` };
  }

  void writeActivity(supabase, {
    admin_id:     user.id,
    action:       "export_snapshot",
    entity_type:  "system",
    entity_id:    user.id,
    entity_label: "Snapshot JSON",
  });

  return { success: true, snapshot: data as Record<string, unknown> };
}

// ── toggleUserStatusAction ────────────────────────────────────────────
// Soft-disables or re-enables a user. Never deletes auth records.
// Uses admin_set_user_disabled() SECURITY DEFINER RPC — avoids the
// permission denied error caused by the missing INSERT/UPDATE GRANT
// on user_profiles for the `authenticated` role.

export async function toggleUserStatusAction(
  _prev: ToggleUserState,
  formData: FormData
): Promise<ToggleUserState> {
  const targetId   = (formData.get("user_id")   as string | null)?.trim() ?? "";
  const action     = (formData.get("action")    as string | null)?.trim() ?? "";
  const targetName = (formData.get("user_name") as string | null)?.trim() ?? targetId;

  if (!targetId || !["disable", "enable"].includes(action)) {
    return { error: "Datos incompletos." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "No autenticado." };

  const isDisabled = action === "disable";

  const { error: rpcErr } = await supabase.rpc("admin_set_user_disabled", {
    p_target_user_id: targetId,
    p_disabled:       isDisabled,
  });

  if (rpcErr) {
    const msg = rpcErr.message;
    if (msg === "not_authenticated")  return { error: "No autenticado." };
    if (msg === "not_admin")          return { error: "Sin permisos de administrador." };
    if (msg === "cannot_modify_self") return { error: "No puedes modificar tu propio estado." };
    return { error: msg };
  }

  void writeActivity(supabase, {
    admin_id:     user.id,
    action:       isDisabled ? "user_disable" : "user_enable",
    entity_type:  "user",
    entity_id:    targetId,
    entity_label: targetName,
    new_values:   { is_disabled: isDisabled },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// ── updateMatchResultAction ───────────────────────────────────────────
// Calls update_match_result RPC — enforces admin check in PostgreSQL,
// updates status + scores, and triggers calculate_match_points on finish.

export async function updateMatchResultAction(
  _prev: UpdateMatchState,
  formData: FormData
): Promise<UpdateMatchState> {
  const matchId           = (formData.get("match_id")           as string | null) ?? "";
  const status            = (formData.get("status")             as string | null) ?? "";
  const homeRaw           = (formData.get("home_score")         as string | null) ?? "";
  const awayRaw           = (formData.get("away_score")         as string | null) ?? "";
  const matchLabel        = (formData.get("match_label")        as string | null) ?? "";
  const advancingTeamRaw  = (formData.get("advancing_team_id")  as string | null)?.trim() || null;

  if (!matchId || !status) return { error: "Datos incompletos." };

  let homeScore = homeRaw !== "" ? parseInt(homeRaw, 10) : null;
  let awayScore = awayRaw !== "" ? parseInt(awayRaw, 10) : null;
  if (homeScore !== null && isNaN(homeScore)) return { error: "Marcador local inválido." };
  if (awayScore !== null && isNaN(awayScore)) return { error: "Marcador visitante inválido." };

  // Live matches must always have a numeric score.
  // When the admin transitions a match to "live" without entering scores,
  // default to 0-0 so the UI never shows "- vs -" and so the client-side
  // goal-celebration hook never sees a null→0 transition.
  if (status === "live") {
    if (homeScore === null) homeScore = 0;
    if (awayScore === null) awayScore = 0;
  }

  const supabase = await createClient();

  const { data: oldMatch } = await supabase
    .from("matches")
    .select("status, home_score, away_score, advancing_team_id")
    .eq("id", matchId)
    .single();

  const { data: rpcData, error } = await supabase.rpc("update_match_result", {
    p_match_id:           matchId,
    p_status:             status,
    p_home_score:         homeScore,
    p_away_score:         awayScore,
    p_advancing_team_id:  advancingTeamRaw,
  });

  if (error) {
    const msg = error.message;
    if (msg === "not_admin")              return { error: "Sin permisos de administrador." };
    if (msg === "match_not_found")        return { error: "Partido no encontrado." };
    if (msg === "invalid_status")         return { error: "Estado inválido." };
    if (msg === "invalid_scores")         return { error: "Marcador fuera de rango (0–30)." };
    if (msg === "advancing_team_required") return { error: "Empate en eliminatoria: debes seleccionar el equipo clasificado." };
    if (msg === "invalid_advancing_team") return { error: "El equipo clasificado no pertenece a este partido." };
    return { error: `Error: ${msg}` };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const newValues = { status, home_score: homeScore, away_score: awayScore, advancing_team_id: advancingTeamRaw };
    void writeMatchAudit(supabase, {
      match_id: matchId, admin_id: user.id,
      action: "update_result", old_values: oldMatch ?? null, new_values: newValues,
    });
    void writeActivity(supabase, {
      admin_id: user.id, action: "match_result",
      entity_type: "match", entity_id: matchId,
      entity_label: matchLabel || matchId,
      old_values: oldMatch ?? null, new_values: newValues,
    });
  }

  // Generate news when the match is officially closed.
  // Fire-and-forget: errors are caught internally and never propagate.
  if (status === "finished") {
    void generateMatchNews(matchId);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/matches");
  revalidatePath("/dashboard");
  revalidatePath("/groups", "layout");

  const scored = (rpcData as { scored?: number } | null)?.scored ?? 0;
  return { success: true, scored };
}

// ── updateMatchFixtureAction ──────────────────────────────────────────
// Edits fixture metadata (starts_at, group_code). No scoring side-effects.

export async function updateMatchFixtureAction(
  _prev: UpdateFixtureState,
  formData: FormData
): Promise<UpdateFixtureState> {
  const matchId     = (formData.get("match_id")    as string | null)?.trim() ?? "";
  const startsAtRaw = (formData.get("starts_at")   as string | null)?.trim() ?? "";
  const groupCode   = (formData.get("group_code")  as string | null)?.trim() || null;
  const matchLabel  = (formData.get("match_label") as string | null)?.trim() ?? "";

  if (!matchId)     return { error: "match_id requerido." };
  if (!startsAtRaw) return { error: "Kickoff requerido." };

  let startsAt: string;
  try {
    const date = new Date(startsAtRaw.includes("Z") ? startsAtRaw : startsAtRaw + "Z");
    if (isNaN(date.getTime())) throw new Error("invalid");
    startsAt = date.toISOString();
  } catch {
    return { error: "Fecha/hora inválida. Usa el formato AAAA-MM-DDTHH:mm." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado." };
  if (!(await isAdmin(user.id))) return { error: "Sin permisos de administrador." };

  const { data: oldMatch } = await supabase
    .from("matches")
    .select("starts_at, group_code")
    .eq("id", matchId)
    .single();

  // Use a SECURITY DEFINER RPC — direct .update() is blocked by RLS because
  // the matches table has no UPDATE policy (intentional; all writes go via RPC).
  const { error: rpcError } = await supabase.rpc("update_match_fixture", {
    p_match_id:   matchId,
    p_starts_at:  startsAt,
    p_group_code: groupCode ?? null,
  });

  if (rpcError) {
    const msg = rpcError.message;
    if (msg === "not_admin")       return { error: "Sin permisos de administrador." };
    if (msg === "match_not_found") return { error: "Partido no encontrado." };
    return { error: `Error al guardar fixture: ${msg}` };
  }

  const newValues = { starts_at: startsAt, group_code: groupCode };
  void writeMatchAudit(supabase, {
    match_id: matchId, admin_id: user.id,
    action: "update_fixture", old_values: oldMatch ?? null, new_values: newValues,
  });
  void writeActivity(supabase, {
    admin_id: user.id, action: "match_fixture",
    entity_type: "match", entity_id: matchId,
    entity_label: matchLabel || matchId,
    old_values: oldMatch ?? null, new_values: newValues,
  });

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ── advancedEditMatchAction ───────────────────────────────────────────
// Full-field match editor for emergency corrections.
// Calls admin_edit_match_full SECURITY DEFINER — all validation lives
// in the database function; this layer handles parsing and audit writing.

export async function advancedEditMatchAction(
  _prev: AdvancedEditState,
  formData: FormData
): Promise<AdvancedEditState> {
  const matchId          = (formData.get("match_id")          as string | null)?.trim() ?? "";
  const matchLabel       = (formData.get("match_label")        as string | null)?.trim() ?? "";
  const homeTeamRaw       = (formData.get("home_team_id")        as string | null)?.trim() || null;
  const awayTeamRaw       = (formData.get("away_team_id")        as string | null)?.trim() || null;
  const homePlaceholder   = (formData.get("home_placeholder")    as string | null)?.trim() || null;
  const awayPlaceholder   = (formData.get("away_placeholder")    as string | null)?.trim() || null;
  const startsAtRaw       = (formData.get("starts_at")           as string | null)?.trim() ?? "";
  const stage             = (formData.get("stage")               as string | null)?.trim() ?? "";
  const status            = (formData.get("status")              as string | null)?.trim() ?? "";
  const homeScoreRaw      = (formData.get("home_score")          as string | null)?.trim() ?? "";
  const awayScoreRaw      = (formData.get("away_score")          as string | null)?.trim() ?? "";
  const groupCodeRaw      = (formData.get("group_code")          as string | null)?.trim() || null;
  const matchNumberRaw    = (formData.get("match_number")        as string | null)?.trim() ?? "";
  const venueRaw          = (formData.get("venue")               as string | null)?.trim() || null;
  const advancingTeamRaw  = (formData.get("advancing_team_id")   as string | null)?.trim() || null;

  if (!matchId)    return { error: "match_id requerido." };
  if (!startsAtRaw) return { error: "Fecha/hora requerida." };
  if (!stage)      return { error: "Etapa requerida." };
  if (!status)     return { error: "Estado requerido." };

  // Parse starts_at — input comes as datetime-local (no timezone), treat as UTC
  let startsAt: string;
  try {
    const raw  = startsAtRaw.includes("Z") ? startsAtRaw : startsAtRaw + "Z";
    const date = new Date(raw);
    if (isNaN(date.getTime())) throw new Error("invalid");
    startsAt = date.toISOString();
  } catch {
    return { error: "Fecha/hora inválida. Usa el formato AAAA-MM-DDTHH:mm." };
  }

  const homeScore   = homeScoreRaw   !== "" ? parseInt(homeScoreRaw,   10) : null;
  const awayScore   = awayScoreRaw   !== "" ? parseInt(awayScoreRaw,   10) : null;
  const matchNumber = matchNumberRaw !== "" ? parseInt(matchNumberRaw, 10) : null;

  if (homeScore   !== null && isNaN(homeScore))   return { error: "Marcador local inválido." };
  if (awayScore   !== null && isNaN(awayScore))   return { error: "Marcador visitante inválido." };
  if (matchNumber !== null && isNaN(matchNumber)) return { error: "Número de partido inválido." };

  if (homeTeamRaw && awayTeamRaw && homeTeamRaw === awayTeamRaw) {
    return { error: "El equipo local y visitante no pueden ser el mismo." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "No autenticado." };
  if (!(await isAdmin(user.id))) return { error: "Sin permisos de administrador." };

  const { data: oldMatch } = await supabase
    .from("matches")
    .select("home_team_id, away_team_id, home_placeholder, away_placeholder, starts_at, stage, status, home_score, away_score, group_code, match_number, venue")
    .eq("id", matchId)
    .single();

  const { data: rpcData, error: rpcErr } = await supabase.rpc("admin_edit_match_full", {
    p_match_id:           matchId,
    p_home_team_id:       homeTeamRaw,
    p_away_team_id:       awayTeamRaw,
    p_home_placeholder:   homePlaceholder,
    p_away_placeholder:   awayPlaceholder,
    p_starts_at:          startsAt,
    p_stage:              stage,
    p_status:             status,
    p_home_score:         homeScore,
    p_away_score:         awayScore,
    p_group_code:         groupCodeRaw,
    p_match_number:       matchNumber,
    p_venue:              venueRaw,
    p_advancing_team_id:  advancingTeamRaw,
  });

  if (rpcErr) {
    const msg = rpcErr.message;
    if (msg === "not_admin")               return { error: "Sin permisos de administrador." };
    if (msg === "match_not_found")         return { error: "Partido no encontrado." };
    if (msg === "invalid_status")          return { error: "Estado inválido." };
    if (msg === "invalid_stage")           return { error: "Etapa inválida." };
    if (msg === "same_team_both_sides")    return { error: "El equipo local y visitante no pueden ser el mismo." };
    if (msg === "finished_requires_scores") return { error: "Un partido finalizado debe tener marcador." };
    if (msg === "invalid_scores")          return { error: "Marcador fuera de rango (0–30)." };
    if (msg === "advancing_team_required") return { error: "Empate en eliminatoria: debes seleccionar el equipo clasificado." };
    if (msg === "invalid_advancing_team")  return { error: "El equipo clasificado no pertenece a este partido." };
    return { error: `Error: ${msg}` };
  }

  const newValues = {
    home_team_id: homeTeamRaw, away_team_id: awayTeamRaw,
    home_placeholder: homePlaceholder, away_placeholder: awayPlaceholder,
    starts_at: startsAt, stage, status,
    home_score: homeScore, away_score: awayScore,
    group_code: groupCodeRaw, match_number: matchNumber, venue: venueRaw,
    advancing_team_id: advancingTeamRaw,
  };

  void writeActivity(supabase, {
    admin_id:     user.id,
    action:       "advanced_edit",
    entity_type:  "match",
    entity_id:    matchId,
    entity_label: matchLabel || matchId,
    old_values:   oldMatch ?? null,
    new_values:   newValues,
  });

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath(`/admin/matches/${matchId}/advanced`);
  revalidatePath("/dashboard");
  revalidatePath("/groups", "layout");

  const scored = (rpcData as { scored?: number } | null)?.scored ?? 0;
  return { success: true, scored };
}

// ── updateGroupPrizeAction ────────────────────────────────────────────
// Saves entry fee and prize percentages for the community group.

export async function updateGroupPrizeAction(
  _prev: UpdatePrizeState,
  formData: FormData
): Promise<UpdatePrizeState> {
  const groupId       = (formData.get("group_id")         as string | null) ?? "";
  const entryRaw      = (formData.get("entry_fee")         as string | null) ?? "";
  const firstRaw      = (formData.get("first_place_pct")   as string | null) ?? "";
  const secondRaw     = (formData.get("second_place_pct")  as string | null) ?? "";

  if (!groupId) return { error: "Grupo no encontrado." };

  const entryFee       = parseInt(entryRaw,  10);
  const firstPlacePct  = parseInt(firstRaw,  10);
  const secondPlacePct = parseInt(secondRaw, 10);

  if (isNaN(entryFee)  || entryFee  < 0)   return { error: "Inscripción inválida." };
  if (isNaN(firstPlacePct)  || firstPlacePct  < 0 || firstPlacePct  > 100) return { error: "Porcentaje inválido." };
  if (isNaN(secondPlacePct) || secondPlacePct < 0 || secondPlacePct > 100) return { error: "Porcentaje inválido." };
  if (firstPlacePct + secondPlacePct !== 100) return { error: "Los porcentajes deben sumar 100%." };

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "No autenticado." };
  if (!(await isAdmin(user.id))) return { error: "Sin permisos." };

  const { error } = await supabase.rpc("update_group_prize_config", {
    p_group_id:         groupId,
    p_entry_fee:        entryFee,
    p_first_place_pct:  firstPlacePct,
    p_second_place_pct: secondPlacePct,
  });

  if (error) {
    if (error.message === "percentages_must_sum_100") return { error: "Los porcentajes deben sumar 100%." };
    return { error: error.message };
  }

  revalidatePath("/admin/invitations");
  revalidatePath("/dashboard");
  return { success: true };
}

// ── generateMatchNews ─────────────────────────────────────────────────
// Generates and inserts one news post for a finished match.
//
// Guarantees:
//   · Never throws — all errors are caught and logged internally.
//   · Idempotent — skips silently if a news row already exists for the
//     match (application-level check; DB UNIQUE constraint is the backstop).
//   · No external services — headline/body/image_type are pure templates.
//
// Called with `void` from updateMatchResultAction so it never blocks
// the admin action or the match-close flow.

async function generateMatchNews(matchId: string): Promise<void> {
  try {
    const supabase = await createClient();

    // Application-level deduplication check (DB UNIQUE is the safety net)
    const { data: existing } = await supabase
      .from("news")
      .select("id")
      .eq("match_id", matchId)
      .maybeSingle();

    if (existing) return;

    const ctx = await getMatchNewsContext(matchId);
    if (!ctx) return;

    const headline   = buildHeadline(ctx);
    const body       = buildBody(ctx);
    const image_type = selectImageType(ctx);

    await supabase.from("news").insert({ match_id: matchId, headline, body, image_type });
  } catch (err) {
    console.error("[generateMatchNews] failed for match", matchId, err);
  }
}
