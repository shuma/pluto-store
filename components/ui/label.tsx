"use client";

import * as React from "react";
import { cn } from "cn";
import { Label as LabelPrimitive } from "radix-ui";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm font-medium text-neutral-10 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-neutral-6 peer-disabled:cursor-not-allowed peer-disabled:text-neutral-6",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
