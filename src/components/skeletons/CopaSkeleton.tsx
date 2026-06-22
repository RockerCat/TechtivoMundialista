import { SkeletonBar } from "./primitives";

function GroupCardSkeleton() {
  return (
    <div className="bg-[#0B1020] border border-[#1A2140] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1A2140]">
        <SkeletonBar className="w-20" />
      </div>
      <div className="p-3 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} className="w-full h-6" />
        ))}
      </div>
    </div>
  );
}

function BracketColumnSkeleton() {
  return (
    <div className="w-32 shrink-0 space-y-2">
      <SkeletonBar className="w-16 h-2.5" />
      <div className="bg-[#0B1020] border border-[#1A2140] rounded-xl h-20 animate-pulse" />
      <div className="bg-[#0B1020] border border-[#1A2140] rounded-xl h-20 animate-pulse" />
    </div>
  );
}

export default function CopaSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <SkeletonBar className="w-44 h-6" />
        <SkeletonBar className="w-32 h-3" />
      </div>

      {/* View toggle */}
      <div className="bg-[#0B1020] border border-[#1A2140] rounded-xl p-1 inline-flex gap-1">
        <div className="w-20 h-7 rounded-lg bg-[#1A2140] animate-pulse" />
        <div className="w-20 h-7 rounded-lg animate-pulse bg-[#0B1020]" />
      </div>

      {/* Groups */}
      <div className="grid gap-4 md:grid-cols-2">
        <GroupCardSkeleton />
        <GroupCardSkeleton />
      </div>

      {/* Bracket hint */}
      <div className="flex items-start gap-3 overflow-hidden">
        <BracketColumnSkeleton />
        <BracketColumnSkeleton />
        <BracketColumnSkeleton />
      </div>
    </div>
  );
}
