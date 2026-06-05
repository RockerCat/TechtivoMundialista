-- =====================================================================
-- El VAR — Migration 002: Fix RLS infinite recursion in group_members
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================================
--
-- ROOT CAUSE
-- ----------
-- The group_members SELECT policy contained a self-referential subquery:
--
--   USING (
--     group_id IN (
--       SELECT gm.group_id FROM group_members gm   -- ← references group_members
--       WHERE gm.user_id = auth.uid()
--     )
--   )
--
-- When PostgreSQL evaluates any query on group_members it must first
-- evaluate this USING clause.  That clause fires another query on
-- group_members, which requires evaluating the USING clause again,
-- which fires another query… → 42P17 infinite recursion.
--
-- The groups SELECT policy makes it worse: it queries group_members in
-- its own USING clause.  So even a plain INSERT INTO groups … RETURNING
-- triggers the cycle:
--
--   INSERT groups  →  RETURNING applies groups SELECT policy
--   groups SELECT policy  →  subquery on group_members
--   group_members SELECT policy  →  subquery on group_members  ← 42P17
--
-- FIX
-- ---
-- Introduce a SECURITY DEFINER helper function get_user_group_ids().
-- Inside a SECURITY DEFINER function PostgreSQL executes the body with
-- the privileges of the function owner and does NOT apply RLS to tables
-- the function reads.  The recursive dependency is broken because the
-- function can query group_members freely, without triggering any policy.
--
-- Both the groups policy and the group_members policy call this helper
-- instead of embedding a raw subquery on group_members.
-- =====================================================================


-- ── 1. Drop the broken policies ──────────────────────────────────────

DROP POLICY IF EXISTS "members_select_groups"      ON groups;
DROP POLICY IF EXISTS "members_select_memberships" ON group_members;


-- ── 2. SECURITY DEFINER helper ───────────────────────────────────────
-- Reads group_members WITHOUT RLS, returns the group IDs the given
-- user belongs to.  This is the single safe entry-point for membership
-- checks used by both table policies below.

CREATE OR REPLACE FUNCTION get_user_group_ids(uid UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT group_id
  FROM   group_members
  WHERE  user_id = uid;
$$;

-- Only authenticated sessions may call this function.
REVOKE ALL     ON FUNCTION get_user_group_ids(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_user_group_ids(UUID) TO authenticated;


-- ── 3. Recreate policies using the non-recursive helper ──────────────

-- groups: a user may see a group only if they are a member.
CREATE POLICY "members_select_groups" ON groups
  FOR SELECT USING (
    id IN (SELECT get_user_group_ids(auth.uid()))
  );

-- group_members: a user may see any membership row that belongs to
-- one of their groups (needed for member counts and future member lists).
-- Uses the SECURITY DEFINER helper → no recursion.
CREATE POLICY "members_select_memberships" ON group_members
  FOR SELECT USING (
    group_id IN (SELECT get_user_group_ids(auth.uid()))
  );
