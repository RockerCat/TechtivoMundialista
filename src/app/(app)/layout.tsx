import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import AppFooter from "@/components/layout/AppFooter";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="pb-16 md:pb-0">
        {children}
        <AppFooter />
      </div>
      <BottomNav />
    </>
  );
}
