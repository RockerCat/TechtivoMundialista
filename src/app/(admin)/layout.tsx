import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/db/admin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AppFooter from "@/components/layout/AppFooter";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!(await isAdmin(user.id))) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-[#0a0a12] text-[#f1f5f9] md:flex">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        <div className="flex-1">{children}</div>
        <AppFooter />
      </main>
    </div>
  );
}
