"use client";
import { cn } from "@/lib/utils";
// The one control for choosing one of a few options: which catalog, which
// size system, which frame, which paper, which currency. White on grey, like
// a tab set, so a choice always looks the same wherever it appears.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
}: {
  label: string;
  options: readonly { value: T; label: React.ReactNode; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-muted p-1",
        size === "sm" && "rounded-lg p-1",
      )}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={option.title}
            onClick={() => !on && onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg font-medium text-muted-foreground transition-[color,background-color,box-shadow] hover:text-foreground focus-ring",
              size === "md"
                ? "h-9 px-3 text-sm"
                : "h-7 rounded-sm px-3 text-xs",
              on && "bg-background text-foreground shadow-sm",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
