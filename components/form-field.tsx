import { cn } from "@/lib/utils";
// One field look for every text control, so inputs, the address row and the
// textarea share a height, radius and focus ring: the theme's recessed text
// field, matching components/ui/input.
export const FIELD =
  "w-full rounded-lg border-0 surface-recessed bg-neutral-1 px-3 text-base text-neutral-10 shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4),var(--surface-recessed-shadow)] outline-none transition-[color,box-shadow] placeholder:text-muted-foreground hover:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-5),var(--surface-recessed-shadow)] focus-visible:shadow-[inset_0_0_0_var(--border-s)_var(--color-1-transparent),var(--surface-recessed-shadow)] focus-ring read-only:bg-neutral-2 read-only:text-neutral-8 disabled:cursor-not-allowed disabled:bg-neutral-3 disabled:bg-none disabled:text-neutral-6 disabled:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4-transparent)] aria-invalid:shadow-[inset_0_0_0_var(--border-s)_var(--error),var(--surface-recessed-shadow)] md:text-sm";

// A labelled control with a hint underneath that turns into the error when
// there is one, and room on the right for a counter or similar.
export function Field({
  id,
  label,
  hint,
  error,
  aside,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  error?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      {children}
      <p
        className={cn(
          "mt-2 flex justify-between gap-4 text-sm",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <span>{error ?? hint}</span>
        {aside}
      </p>
    </div>
  );
}
