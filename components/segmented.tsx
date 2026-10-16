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

// The same control for choosing several at once: each option toggles, and
// the ones on look like Segmented's chosen one.
export function Toggles<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly {
    value: T;
    label: React.ReactNode;
    title?: string;
    // Can't be turned off, with why in the title.
    locked?: boolean;
  }[];
  value: readonly T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1"
    >
      {options.map((option) => {
        const on = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            title={option.title}
            disabled={on && option.locked}
            onClick={() =>
              onChange(
                on
                  ? value.filter((v) => v !== option.value)
                  : [...value, option.value],
              )
            }
            className={cn(
              "inline-flex h-7 items-center gap-2 rounded-sm px-3 text-xs font-medium text-muted-foreground transition-[color,background-color,box-shadow] hover:text-foreground focus-ring disabled:cursor-default",
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
