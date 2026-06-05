import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "blue" | "gold" | "red" | "gray" | "live";
  className?: string;
}

export default function Badge({
  children,
  variant = "gray",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        {
          "bg-[#38BDF8]/15 text-[#38BDF8]": variant === "green",
          "bg-[#3b82f6]/15 text-[#3b82f6]": variant === "blue",
          "bg-[#f59e0b]/15 text-[#f59e0b]": variant === "gold",
          "bg-[#ef4444]/15 text-[#ef4444]": variant === "red",
          "bg-[#475569]/20 text-[#94a3b8]": variant === "gray",
          "bg-[#ef4444]/15 text-[#ef4444] animate-live-pulse": variant === "live",
        },
        className
      )}
    >
      {variant === "live" && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-live-pulse" />
      )}
      {children}
    </span>
  );
}
