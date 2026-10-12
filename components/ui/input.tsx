import * as React from "react";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border-0 surface-recessed bg-neutral-1 px-3 py-2 text-base text-neutral-10 shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4),var(--surface-recessed-shadow)] transition-[color,box-shadow] outline-none focus-ring file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-5),var(--surface-recessed-shadow)] focus-visible:shadow-[inset_0_0_0_var(--border-s)_var(--color-1-transparent),var(--surface-recessed-shadow)] read-only:bg-neutral-2 read-only:text-neutral-8 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-neutral-3 disabled:bg-none disabled:text-neutral-6 disabled:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4-transparent)] aria-invalid:shadow-[inset_0_0_0_var(--border-s)_var(--error),var(--surface-recessed-shadow)] md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
