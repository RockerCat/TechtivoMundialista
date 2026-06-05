import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { isGroupMember } from "@/lib/db/groups";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Admins go directly to the operations panel
  if (await isAdmin(user.id)) redirect("/admin");

  // Disabled members cannot access the app
  if (await isUserDisabled(user.id)) redirect("/disabled");

  // Invited group members go to the player dashboard
  if (await isGroupMember(user.id)) redirect("/dashboard");

  // Everyone else (accounts created without an invite) sees the access wall
  redirect("/no-access");
}
