import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "raised" | "bordered" | "glow-green" | "glow-blue";
}

export default function Card({
  variant = "default",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        {
          "bg-[#18182a] border border-[#2a2a45]": variant === "default",
          "bg-[#20203a] border border-[#2a2a45]": variant === "raised",
          "bg-transparent border border-[#2a2a45]": variant === "bordered",
          "bg-[#18182a] border border-[#38BDF8]/30 shadow-[0_0_24px_rgba(56,189,248,0.08)]":
            variant === "glow-green",
          "bg-[#18182a] border border-[#3b82f6]/30 shadow-[0_0_24px_rgba(59,130,246,0.08)]":
            variant === "glow-blue",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
