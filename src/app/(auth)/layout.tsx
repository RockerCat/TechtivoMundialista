import AppFooter from "@/components/layout/AppFooter";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#38BDF8]/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[200px] bg-[#3b82f6]/4 rounded-full blur-[80px]" />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
      <AppFooter />
    </div>
  );
}
