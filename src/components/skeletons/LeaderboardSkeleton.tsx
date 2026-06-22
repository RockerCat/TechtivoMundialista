import { SkeletonBar, SkeletonCircle } from "./primitives";

function RowSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2a2a45] bg-[#18182a] px-4 py-3 flex items-center gap-3">
      <SkeletonBar className="w-5 h-4" />
      <SkeletonCircle className="w-7 h-7" />
      <SkeletonBar className="flex-1" />
      <SkeletonBar className="w-10 h-5" />
    </div>
  );
}

export default function LeaderboardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6 space-y-2">
        <SkeletonBar className="w-48 h-6" />
        <SkeletonBar className="w-40 h-3" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
