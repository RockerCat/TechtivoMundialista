import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserGroupsWithMeta } from "@/lib/db/groups";
import { isUserDisabled } from "@/lib/db/admin";

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (await isUserDisabled(user.id)) redirect("/disabled");

  const groups = await getUserGroupsWithMeta(user.id);
  if (groups.length === 0) redirect("/dashboard");

  redirect(`/groups/${groups[0].id}`);
}
