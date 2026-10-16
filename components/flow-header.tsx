import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

// Uploading the photo comes before the story the bar tells, so it isn't a
// step: the bar starts once the artwork is being made.
const STEPS = ["Create", "Choose", "Poster"];

// A slim bar that stays put while the customer scrolls: back to the store,
// whose store this is, and how far along they are, shown as a progress bar
// rather than a row of labels that doesn't fit a phone. The bar is the only
// count: a "2/4" beside it said the same thing twice.
export function FlowHeader({
  slug,
  name,
  avatarUrl,
  step,
  wide = false,
}: {
  slug: string;
  name: string;
  avatarUrl?: string | null;
  // Leave out to hide the bar, as the upload page does.
  step?: number;
  // Matches a page laid out at max-w-6xl, so the bar lines up with it.
  wide?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex h-14 items-center gap-2 px-2 sm:px-4",
          wide ? "max-w-6xl" : "max-w-5xl",
        )}
      >
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href={`/${slug}`} aria-label={`Back to ${name}`}>
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt=""
              className="size-6 shrink-0 rounded-full object-cover"
            />
          )}
          <span className="truncate text-sm font-medium">{name}</span>
        </div>
        {/* Balances the back button so the store name stays centred. */}
        <span className="w-10 shrink-0" aria-hidden />
      </div>
      {step !== undefined && (
        <ol
          aria-label="Creation progress"
          className={cn(
            "mx-auto flex gap-1 px-4 pb-2",
            wide ? "max-w-6xl" : "max-w-5xl",
          )}
        >
          {STEPS.map((label, i) => (
            <li
              key={label}
              aria-current={i === step ? "step" : undefined}
              className={
                "h-1 flex-1 rounded-full transition-colors " +
                (i <= step ? "bg-foreground" : "bg-neutral-4")
              }
            >
              <span className="sr-only">
                {label}
                {i < step ? ", done" : i === step ? ", current step" : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </header>
  );
}
