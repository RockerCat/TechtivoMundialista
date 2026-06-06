import Image from "next/image";
import { cn } from "@/lib/utils";

interface TechtivoWordmarkProps {
  width?: number;
  height?: number;
  subtitleClassName?: string;
  className?: string;
}

export default function TechtivoWordmark({
  width = 108,
  height = 23,
  subtitleClassName,
  className,
}: TechtivoWordmarkProps) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      <Image
        src="/techtivo-logo.png"
        width={width}
        height={height}
        alt="Techtivo"
        priority
      />
      <span className={cn(
        "font-semibold tracking-[0.18em] uppercase text-[#64748b]",
        subtitleClassName
      )}>
        Pollita
      </span>
    </div>
  );
}
