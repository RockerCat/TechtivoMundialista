"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef, useRef } from "react";
import { getRandomLoadingMessage } from "@/lib/loading-messages";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Pick a message once per mount so it stays stable across re-renders
    // while the button is loading.
    const messageRef = useRef(getRandomLoadingMessage());

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold rounded-xl",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.97]",
          {
            // Variants
            "bg-[#38BDF8] text-[#0a0a12] hover:bg-[#7DD3FC] shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_28px_rgba(56,189,248,0.4)]":
              variant === "primary",
            "bg-[#18182a] text-[#f1f5f9] border border-[#2a2a45] hover:bg-[#20203a] hover:border-[#3b3b60]":
              variant === "secondary",
            "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a]":
              variant === "ghost",
            "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20":
              variant === "danger",
            // Sizes
            "h-9 px-4 text-sm gap-1.5": size === "sm",
            "h-11 px-6 text-sm gap-2": size === "md",
            "h-14 px-8 text-base gap-2": size === "lg",
            // Width
            "w-full": fullWidth,
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>{messageRef.current}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
