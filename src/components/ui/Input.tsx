"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#94a3b8]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-12 rounded-xl bg-[#18182a] border text-[#f1f5f9]",
              "placeholder:text-[#64748b] text-sm",
              "transition-colors duration-150",
              error
                ? "border-[#ef4444]/50 focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                : "border-[#2a2a45] focus:border-[#38BDF8]/60 focus:ring-[#38BDF8]/10",
              "focus:outline-none focus:ring-4",
              leftIcon ? "pl-10 pr-4" : "px-4",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
        {hint && !error && <p className="text-xs text-[#64748b]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
