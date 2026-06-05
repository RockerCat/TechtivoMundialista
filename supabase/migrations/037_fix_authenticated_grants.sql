grant select on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select on public.user_profiles to authenticated;
grant select on public.admin_users to authenticated;
grant select on public.matches to authenticated;
grant select on public.teams to authenticated;
grant select on public.predictions to authenticated;

grant insert, update, delete on public.matches to authenticated;
grant insert, update, delete on public.predictions to authenticated;
grant insert, update, delete on public.teams to authenticated;
grant insert, update, delete on public.admin_match_audit to authenticated;
grant insert, update, delete on public.admin_activity_log to authenticated;