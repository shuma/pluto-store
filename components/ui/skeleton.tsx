import { cn } from "cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse-fast rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
