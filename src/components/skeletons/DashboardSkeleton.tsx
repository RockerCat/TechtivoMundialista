import { SkeletonBar, SkeletonCard, SkeletonCircle } from "./primitives";

function MatchCardSkeleton() {
  return (
    <SkeletonCard className="bg-[#18182a]">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBar className="w-16" />
        <SkeletonBar className="w-10" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2.5">
          <SkeletonCircle className="w-8 h-8" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBar className="w-full max-w-[90px]" />
            <SkeletonBar className="w-10 h-2" />
          </div>
        </div>
        <SkeletonBar className="w-10 h-6 shrink-0" />
        <div className="flex-1 flex items-center gap-2.5 flex-row-reverse">
          <SkeletonCircle className="w-8 h-8" />
          <div className="flex-1 space-y-1.5 items-end flex flex-col">
            <SkeletonBar className="w-full max-w-[90px]" />
            <SkeletonBar className="w-10 h-2" />
          </div>
        </div>
      </div>
    </SkeletonCard>
  );
}

function SummaryPanelSkeleton() {
  return (
    <SkeletonCard className="p-4 lg:p-5">
      <div className="flex items-center gap-3 mb-3 lg:mb-5">
        <SkeletonCircle className="w-8 h-8 lg:w-10 lg:h-10" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBar className="w-20" />
          <SkeletonBar className="w-12 h-2 hidden lg:block" />
        </div>
      </div>
      <div className="border-t border-[#1e1e35] pt-3 grid grid-cols-3 gap-2">
        <SkeletonBar className="h-5" />
        <SkeletonBar className="h-5" />
        <SkeletonBar className="h-5" />
      </div>
    </SkeletonCard>
  );
}

function LeaderboardPanelSkeleton() {
  return (
    <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl overflow-hidden">
      <div className="py-3 text-center border-b border-[#2a2a45]">
        <SkeletonBar className="w-16 h-2.5 mx-auto" />
      </div>
      <div className="divide-y divide-[#1e1e35]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2.5">
            <SkeletonBar className="w-5 h-2.5" />
            <SkeletonBar className="flex-1" />
            <SkeletonBar className="w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="max-w-[1320px] mx-auto px-4 py-6">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[220px_1fr_200px] lg:items-start lg:gap-6">
        <main className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 min-w-0 space-y-3">
          <MatchCardSkeleton />
          <MatchCardSkeleton />
          <MatchCardSkeleton />
        </main>
        <aside className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 flex flex-col gap-4">
          <SummaryPanelSkeleton />
        </aside>
        <aside className="order-3 lg:order-none lg:col-start-3 lg:row-start-1">
          <LeaderboardPanelSkeleton />
        </aside>
      </div>
    </div>
  );
}
