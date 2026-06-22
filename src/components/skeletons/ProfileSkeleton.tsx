import { SkeletonBar, SkeletonBlock, SkeletonCard, SkeletonCircle } from "./primitives";

export default function ProfileSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <SkeletonCard className="p-6">
        <div className="flex items-center gap-4 mb-5">
          <SkeletonCircle className="w-14 h-14" />
          <div className="flex-1 space-y-2">
            <SkeletonBar className="w-28" />
            <SkeletonBar className="w-36 h-2.5" />
          </div>
        </div>
        <SkeletonBar className="w-full h-8" />
      </SkeletonCard>

      <div className="grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>

      <SkeletonCard className="p-5 space-y-3">
        <SkeletonBar className="w-24" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
        </div>
      </SkeletonCard>
    </div>
  );
}
