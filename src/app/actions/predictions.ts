"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Prediction, PredictionActionState } from "@/lib/matches";

// ── Group save ────────────────────────────────────────────────────────
// Saves predictions for every open match in a group with one submission.
// Inputs are keyed home_{matchId} / away_{matchId}.
// Empty inputs are skipped (don't overwrite an existing prediction with blank).

export type GroupSaveState = {
  success: boolean;
  errors: Record<string, string>;
} | null;

export async function saveGroupPredictionsAction(
  _prev: GroupSaveState,
  formData: FormData
): Promise<GroupSaveState> {
  const supabase = await createClient();
  const matchIds = formData.getAll("match_id") as string[];

  if (matchIds.length === 0) return { success: false, errors: {} };

  const errors: Record<string, string> = {};
  let saved = 0;

  for (const matchId of matchIds) {
    const homeRaw = (formData.get(`home_${matchId}`) as string | null) ?? "";
    const awayRaw = (formData.get(`away_${matchId}`) as string | null) ?? "";

    if (homeRaw === "" || awayRaw === "") continue; // skip unfilled rows

    const homeScore = parseInt(homeRaw, 10);
    const awayScore = parseInt(awayRaw, 10);

    if (isNaN(homeScore) || isNaN(awayScore)) {
      errors[matchId] = "Marcador inválido.";
      continue;
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "save_prediction_for_user",
      { p_match_id: matchId, p_home_score: homeScore, p_away_score: awayScore }
    );

    if (rpcError) {
      const msg = rpcError.message;
      errors[matchId] =
        msg === "admin_cannot_predict"
          ? "El administrador no participa en la competencia."
          : msg === "not_group_member"
          ? "No perteneces a ningún grupo activo."
          : msg === "user_disabled"
          ? "Tu cuenta está deshabilitada."
          : msg === "match_closed" || msg === "match_not_scheduled" || msg === "match_started"
          ? "Predicciones cerradas para este partido."
          : "No se pudo guardar.";
    } else {
      console.log("[saveGroup] ✓ matchId:", matchId, rpcData);
      saved++;
    }
  }

  if (saved > 0) revalidatePath("/dashboard");

  return {
    success: saved > 0 && Object.keys(errors).length === 0,
    errors,
  };
}

const isDev = process.env.NODE_ENV !== "production";

export async function savePredictionAction(
  _prevState: PredictionActionState,
  formData: FormData
): Promise<PredictionActionState> {
  const matchId   = (formData.get("match_id")    as string | null) ?? "";
  const homeRaw   = (formData.get("home_score")  as string | null) ?? "";
  const awayRaw   = (formData.get("away_score")  as string | null) ?? "";

  console.log("[savePrediction] matchId:", matchId, "home:", homeRaw, "away:", awayRaw);

  // ── Input validation ────────────────────────────────────────────────
  if (!matchId) return { error: "Partido no especificado." };

  const homeScore = parseInt(homeRaw, 10);
  const awayScore = parseInt(awayRaw, 10);

  if (isNaN(homeScore) || isNaN(awayScore)) {
    return { error: "Ingresa un marcador válido para ambos equipos." };
  }
  if (homeScore < 0 || homeScore > 30 || awayScore < 0 || awayScore > 30) {
    return { error: "El marcador debe estar entre 0 y 30." };
  }

  // ── Auth check ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log("[savePrediction] userId:", user?.id ?? null);

  if (authError || !user) {
    return { error: "Debes iniciar sesión para predecir." };
  }

  // ── SECURITY DEFINER RPC — bypasses RLS for the upsert ─────────────
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "save_prediction_for_user",
    {
      p_match_id:   matchId,
      p_home_score: homeScore,
      p_away_score: awayScore,
    }
  );

  console.log("[savePrediction] RPC →", {
    rpcData,
    rpcError: rpcError ? { code: rpcError.code, message: rpcError.message } : null,
  });

  if (rpcError) {
    const msg = rpcError.message;

    if (msg === "not_authenticated") {
      return {
        error: "Problema de autenticación. Cierra sesión y vuelve a ingresar.",
        devMessage: isDev ? "[not_authenticated] auth.uid() is NULL in PostgREST" : undefined,
      };
    }
    if (msg === "admin_cannot_predict") {
      return { error: "El administrador no participa en la competencia." };
    }
    if (msg === "not_group_member") {
      return { error: "No perteneces a ningún grupo activo." };
    }
    if (msg === "user_disabled") {
      return { error: "Tu cuenta está deshabilitada." };
    }
    if (msg === "match_not_scheduled") {
      return { error: "Predicciones cerradas para este partido." };
    }
    if (msg === "match_started") {
      return { error: "El partido ya comenzó. No se pueden guardar predicciones." };
    }
    if (msg === "match_not_found") {
      return { error: "El partido no existe." };
    }
    if (msg === "invalid_scores") {
      return { error: "Marcador inválido. El valor debe estar entre 0 y 30." };
    }

    return {
      error: "No se pudo guardar tu predicción. Intenta de nuevo.",
      devMessage: isDev
        ? `code=${rpcError.code ?? "n/a"} msg="${rpcError.message}"`
        : undefined,
    };
  }

  console.log("[savePrediction] ✓ saved prediction");

  revalidatePath("/dashboard");
  return { success: true, prediction: rpcData as Prediction };
}
