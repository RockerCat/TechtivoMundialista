import { SkeletonBar, SkeletonCard } from "./primitives";

function TextBlockSkeleton() {
  return (
    <SkeletonCard className="space-y-3">
      <SkeletonBar className="w-32 h-2.5" />
      <SkeletonBar className="w-full" />
      <SkeletonBar className="w-5/6" />
      <SkeletonBar className="w-2/3" />
    </SkeletonCard>
  );
}

export default function RulesSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div className="space-y-2">
        <SkeletonBar className="w-56 h-6" />
        <SkeletonBar className="w-40 h-3" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <TextBlockSkeleton key={i} />
      ))}
    </div>
  );
}
