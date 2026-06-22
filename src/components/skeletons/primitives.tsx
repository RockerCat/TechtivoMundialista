import { cn } from "@/lib/utils";

export function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("h-3 rounded-full bg-[#1e1e35] animate-pulse", className)} />;
}

export function SkeletonCircle({ className }: { className?: string }) {
  return <div className={cn("rounded-full bg-[#1e1e35] animate-pulse shrink-0", className)} />;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("rounded-2xl bg-[#1e1e35] animate-pulse", className)} />;
}

export function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("bg-[#11111c] border border-[#1e1e35] rounded-2xl p-4", className)}>
      {children}
    </div>
  );
}
