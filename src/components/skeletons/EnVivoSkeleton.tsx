import { SkeletonBar, SkeletonCard, SkeletonCircle } from "./primitives";

function LiveCardSkeleton() {
  return (
    <SkeletonCard className="bg-[#11111c]">
      <SkeletonBar className="w-20 mb-4" />
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <SkeletonCircle className="w-9 h-9" />
          <SkeletonBar className="w-16" />
        </div>
        <SkeletonBar className="w-8 h-6 shrink-0" />
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <SkeletonCircle className="w-9 h-9" />
          <SkeletonBar className="w-16" />
        </div>
      </div>
    </SkeletonCard>
  );
}

export default function EnVivoSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6 space-y-2">
        <SkeletonBar className="w-24 h-6" />
        <SkeletonBar className="w-56 h-3" />
      </div>
      <LiveCardSkeleton />
    </div>
  );
}
