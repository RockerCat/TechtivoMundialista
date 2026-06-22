import { SkeletonBar, SkeletonCard, SkeletonCircle } from "./primitives";

export default function CommunitySkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <SkeletonBar className="w-16 h-2.5" />

      <div className="space-y-2">
        <SkeletonBar className="w-40 h-6" />
        <SkeletonBar className="w-32 h-3" />
      </div>

      <SkeletonCard className="bg-[#18182a] border-[#2a2a45]">
        <div className="flex items-center gap-3">
          <SkeletonBar className="w-20 h-3" />
          <SkeletonBar className="ml-auto w-24 h-8" />
        </div>
      </SkeletonCard>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <SkeletonBar className="w-28 h-3" />
          <SkeletonCard className="space-y-3">
            <div className="flex items-center gap-3">
              <SkeletonCircle className="w-7 h-7" />
              <SkeletonBar className="flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <SkeletonCircle className="w-7 h-7" />
              <SkeletonBar className="flex-1" />
            </div>
          </SkeletonCard>
        </div>
      ))}
    </div>
  );
}
