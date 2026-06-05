-- =====================================================================
-- El VAR — Migration 001: Groups & Memberships
--
-- Run this in Supabase Dashboard → SQL Editor
-- or via: supabase db push
-- =====================================================================

-- ──────────────────────────────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS groups (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL
                          CHECK (char_length(trim(name)) >= 2
                             AND char_length(trim(name)) <= 50),
  invite_code TEXT        NOT NULL UNIQUE,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id   UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (group_id, user_id)   -- prevents duplicate memberships
);

-- ──────────────────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_groups_owner_id
  ON groups(owner_id);

CREATE INDEX IF NOT EXISTS idx_groups_invite_code
  ON groups(invite_code);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id
  ON group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id
  ON group_members(group_id);

-- ──────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER HELPER — membership lookup (must come before policies)
--
-- A direct subquery on group_members inside a group_members policy
-- causes infinite recursion (42P17).  This SECURITY DEFINER function
-- queries group_members WITHOUT applying RLS, breaking the cycle.
-- Both SELECT policies below call this function instead of embedding
-- a raw subquery on group_members.
-- ──────────────────────────────────────────────────────────────────────

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

REVOKE ALL     ON FUNCTION get_user_group_ids(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_user_group_ids(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- groups: SELECT — user must be a member of the group
-- Uses the SECURITY DEFINER helper to avoid cross-table recursion.
CREATE POLICY "members_select_groups" ON groups
  FOR SELECT USING (
    id IN (SELECT get_user_group_ids(auth.uid()))
  );

-- groups: INSERT — authenticated user sets themselves as owner
CREATE POLICY "auth_insert_groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- groups: UPDATE — only the owner can rename the group
CREATE POLICY "owner_update_groups" ON groups
  FOR UPDATE USING (auth.uid() = owner_id);

-- groups: DELETE — only the owner can delete
CREATE POLICY "owner_delete_groups" ON groups
  FOR DELETE USING (auth.uid() = owner_id);

-- group_members: SELECT — users can see all memberships in their groups
-- Uses the SECURITY DEFINER helper to avoid self-referential recursion.
CREATE POLICY "members_select_memberships" ON group_members
  FOR SELECT USING (
    group_id IN (SELECT get_user_group_ids(auth.uid()))
  );

-- group_members: INSERT — users can only add themselves
CREATE POLICY "users_insert_own_membership" ON group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- group_members: DELETE — users can leave groups (delete own membership)
CREATE POLICY "users_delete_own_membership" ON group_members
  FOR DELETE USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER FUNCTION — invite code lookup
--
-- Allows an authenticated user to find a group by its invite code even
-- before they are a member (bypasses the SELECT RLS on groups).
-- This is the only safe way to implement the "join by code" flow.
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_group_by_invite_code(code TEXT)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  invite_code TEXT,
  owner_id    UUID,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.invite_code,
    g.owner_id,
    g.created_at
  FROM groups g
  WHERE g.invite_code = UPPER(TRIM(code));
END;
$$;

-- Only authenticated users may call this function
REVOKE ALL ON FUNCTION get_group_by_invite_code(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_group_by_invite_code(TEXT) TO authenticated;
