import { createClient } from "@/lib/supabase/server";
import { isTournamentFinished } from "@/lib/db/matches";
import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import AppFooter from "@/components/layout/AppFooter";
import { TabTransitionProvider } from "@/components/layout/TabTransitionProvider";
import TabContentGate from "@/components/layout/TabContentGate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: liveMatch } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "live")
    .limit(1)
    .maybeSingle();
  const hasLiveMatch = !!liveMatch;
  const tournamentFinished = await isTournamentFinished();

  return (
    <TabTransitionProvider>
      <Navbar hasLiveMatch={hasLiveMatch} tournamentFinished={tournamentFinished} />
      <div className="pb-16 md:pb-0">
        <TabContentGate>{children}</TabContentGate>
        <AppFooter />
      </div>
      <BottomNav hasLiveMatch={hasLiveMatch} tournamentFinished={tournamentFinished} />
    </TabTransitionProvider>
  );
}
