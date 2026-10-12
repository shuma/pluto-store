import { cn } from "@/lib/utils";
// A soft outer shell with a header row, holding a lighter inset surface: the
// header names the section and carries its status and actions, and the inset
// carries the thing itself. The inset radius is the shell's minus its padding
// so the two corners stay concentric, and the header and footer share one
// horizontal inset so their edges line up with each other.
export const PANEL_INSET = "overflow-hidden rounded-xl ring-1 ring-neutral-6-transparent bg-paper";
// A white card for a page's main sections, set apart by its fill and border
// alone: no shadow, matching the flat panels on the rest of the dashboard.
// In dark mode it sits on the paper surface.
// The panel's outer shell and its header row, for a panel whose header
// needs its own layout and so can't use `Panel` itself.
export const PANEL_SHELL = "rounded-3xl ring-1 ring-neutral-6-transparent bg-paper-shell p-2";
export const PANEL_HEADER = "flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2";
export const RAISED_CARD = "rounded-3xl ring-1 ring-neutral-6-transparent bg-background dark:bg-paper";
// The header row, content and footer of a panel, without the shell. A panel
// that holds two related things uses it for the second, so they share one
// shell and read as one piece rather than as two separate sections.
export function PanelSection({
  title,
  actions,
  footer,
  children,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={PANEL_HEADER}>
        <h2 className="flex items-center gap-2 text-sm font-medium">{title}</h2>
        {actions && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {actions}
          </div>
        )}
      </div>
      {children}
      {footer && <div className="px-3 pb-2 pt-3">{footer}</div>}
    </>
  );
}
export function Panel({
  className,
  ...section
}: React.ComponentProps<typeof PanelSection> & { className?: string }) {
  return (
    <section
      className={cn(PANEL_SHELL, className)}
    >
      <PanelSection {...section} />
    </section>
  );
}
