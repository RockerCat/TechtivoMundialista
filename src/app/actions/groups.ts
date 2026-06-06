"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode, type GroupActionState } from "@/lib/groups";

const isDev = process.env.NODE_ENV !== "production";

function fmtError(ctx: string, err: { code?: string; message: string; details?: string | null; hint?: string | null }): string {
  return [
    `[${ctx}]`,
    `code=${err.code ?? "n/a"}`,
    `msg="${err.message}"`,
    err.hint    ? `hint="${err.hint}"`       : null,
    err.details ? `details="${err.details}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// ──────────────────────────────────────────────────────────────────────
// createGroupAction
// ──────────────────────────────────────────────────────────────────────

export async function createGroupAction(
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };
  if (name.length > 50) return { error: "El nombre no puede tener más de 50 caracteres." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const detail = authError ? fmtError("getUser", authError) : "getUser returned null user";
    console.error("[createGroup] auth failed:", detail);
    return { error: "Debes iniciar sesión.", devMessage: isDev ? detail : undefined };
  }

  console.log("[createGroup] user:", user.id);

  const inviteCode = generateInviteCode();
  const { data: rows, error: rpcError } = await supabase.rpc("create_group_for_user", {
    p_name: name,
    p_invite_code: inviteCode,
  });

  if (rpcError) {
    const detail = fmtError("rpc.create_group_for_user", rpcError);
    console.error("[createGroup] RPC failed:", detail);
    return {
      error: "No se pudo crear el grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  const group = (rows as { id: string; name: string; invite_code: string }[])[0];
  console.log("[createGroup] ✓ created:", group?.id);

  revalidatePath("/dashboard");
  return { success: true, group };
}

// ──────────────────────────────────────────────────────────────────────
// joinGroupAction
//
// Calls join_group_for_user(p_invite_code) — a SECURITY DEFINER function
// that bypasses RLS, validates auth.uid() internally, and inserts the
// membership atomically.
//
// The function raises PostgreSQL exceptions for both error cases:
//   RAISE EXCEPTION 'not_authenticated'   — auth.uid() is NULL
//   RAISE EXCEPTION 'invalid_code'        — no group found
//
// These arrive as rpcError.message (not rpcData), so the action checks
// rpcError.message directly — no JSON parsing, no mixed error formats.
// ──────────────────────────────────────────────────────────────────────

export async function joinGroupAction(
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const code = (formData.get("invite_code") as string | null)
    ?.trim()
    .toUpperCase() ?? "";

  console.log("[inviteJoin] joinGroupAction called → code:", code);

  if (code.length < 4) {
    return { error: "Ingresa un código de invitación válido." };
  }

  try {
    const supabase = await createClient();

    // ── Auth check ────────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("[inviteJoin] getUser →", {
      userId:    user?.id ?? null,
      authError: authError?.message ?? null,
    });

    if (authError || !user) {
      const detail = authError ? fmtError("getUser", authError) : "getUser returned null user";
      console.error("[inviteJoin] auth failed:", detail);
      return { error: "Debes iniciar sesión.", devMessage: isDev ? detail : undefined };
    }

    // ── Already a member? Return success immediately ───────────────────
    // Idempotency guard: avoids a redundant RPC call if the user is already
    // in group_members (e.g. invite link opened twice, or login after signup).
    const { data: existing } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      console.log("[inviteJoin] user already a member of group_id:", existing.group_id, "— returning success");
      const { data: group } = await supabase
        .from("groups")
        .select("id, name, invite_code")
        .eq("id", existing.group_id)
        .maybeSingle();
      revalidatePath("/dashboard");
      return {
        success: true,
        group: {
          id:          existing.group_id,
          name:        group?.name        ?? "Techtivo Pollita",
          invite_code: group?.invite_code ?? code,
        },
      };
    }

    // ── join_group_for_user RPC ───────────────────────────────────────
    console.log("[inviteJoin] calling join_group_for_user RPC →", { code, userId: user.id });

    const { data: groupId, error: rpcError } = await supabase.rpc(
      "join_group_for_user",
      { p_invite_code: code }
    );

    console.log("[inviteJoin] RPC response →", {
      groupId,
      rpcErrorMsg:  rpcError?.message  ?? null,
      rpcErrorCode: rpcError?.code     ?? null,
      rpcErrorHint: rpcError?.hint     ?? null,
    });

    if (rpcError) {
      const msg = rpcError.message;

      if (msg === "not_authenticated") {
        const detail = "auth.uid() is NULL — JWT did not reach the DB layer. " +
          "This happens when the Server Action runs before auth cookies are set. " +
          "Use the client-side RPC call after signup instead.";
        console.error("[inviteJoin] ✗ not_authenticated:", detail);
        return {
          error: "Problema de autenticación. Cierra sesión, vuelve a ingresar e intenta de nuevo.",
          devMessage: isDev ? detail : undefined,
        };
      }

      if (msg === "invalid_code") {
        console.error("[inviteJoin] ✗ invalid_code for:", code);
        return { error: "Código inválido. Verifica que esté bien escrito." };
      }

      const detail = fmtError("rpc.join_group_for_user", rpcError);
      console.error("[inviteJoin] ✗ unexpected RPC error:", detail);
      return {
        error: "No se pudo unir al grupo. Intenta de nuevo.",
        devMessage: isDev ? detail : undefined,
      };
    }

    // ── Success ───────────────────────────────────────────────────────
    console.log("[inviteJoin] ✓ joined group_id:", groupId);

    const { data: group, error: selectError } = await supabase
      .from("groups")
      .select("id, name, invite_code")
      .eq("id", groupId as string)
      .maybeSingle();

    console.log("[inviteJoin] group SELECT →", {
      found:       !!group,
      selectError: selectError?.message ?? null,
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      group: {
        id:          groupId as string,
        name:        group?.name        ?? "Techtivo Pollita",
        invite_code: group?.invite_code ?? code,
      },
    };

  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[inviteJoin] ✗ uncaught exception:", detail);
    return {
      error: "Error inesperado al unirse al grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }
}
