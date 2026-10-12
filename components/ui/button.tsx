import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

// Pluto Store button: edges are inset shadows (no native border), raised
// variants add the theme's bevel and gradient, and every state takes its
// colours from the theme's component assignments. Heights stay this app's.
// Local exception: ghost and outline hover use solid neutral-3, because the
// theme's neutral-3-transparent is barely visible on the white canvas.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border-0 text-sm font-medium whitespace-nowrap transition-[color,background-color,box-shadow] outline-none select-none focus-ring active:not-aria-[haspopup]:translate-y-(--motion-press-distance) disabled:pointer-events-none aria-invalid:shadow-[inset_0_0_0_var(--border-s)_var(--error)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "surface-raised bg-primary text-primary-foreground shadow-[inset_0_0_0_var(--border-s)_var(--neutral-6-transparent),var(--raised-bevel),var(--shadow-s)] hover:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-7-transparent),var(--raised-bevel),var(--shadow-s)] focus-visible:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-7-transparent),var(--raised-bevel),var(--shadow-s)] disabled:bg-neutral-3 disabled:bg-none disabled:text-neutral-6 disabled:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4-transparent)]",
        outline:
          "bg-transparent text-neutral-10 shadow-[inset_0_0_0_var(--border-s)_var(--neutral-6-transparent)] hover:bg-neutral-3 focus-visible:shadow-[inset_0_0_0_var(--border-s)_var(--color-1-transparent)] aria-expanded:bg-neutral-3 disabled:text-neutral-6 disabled:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4-transparent)]",
        secondary:
          "surface-raised bg-neutral-1 text-neutral-10 shadow-[inset_0_0_0_var(--border-s)_var(--neutral-6-transparent),var(--raised-bevel),var(--shadow-s)] hover:bg-neutral-2 hover:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-7-transparent),var(--raised-bevel),var(--shadow-s)] focus-visible:bg-neutral-2 focus-visible:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-7-transparent),var(--raised-bevel),var(--shadow-s)] aria-expanded:bg-neutral-2 disabled:bg-neutral-3 disabled:bg-none disabled:text-neutral-6 disabled:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4-transparent)]",
        ghost:
          "bg-transparent text-neutral-10 hover:bg-neutral-3 focus-visible:shadow-[inset_0_0_0_var(--border-s)_var(--color-1-transparent)] aria-expanded:bg-neutral-3 disabled:text-neutral-6",
        destructive:
          "surface-raised bg-error text-neutral-1 shadow-[inset_0_0_0_var(--border-s)_var(--error-transparent),var(--raised-bevel)] hover:shadow-[inset_0_0_0_var(--border-s)_var(--error-transparent),var(--raised-bevel),var(--shadow-s)] focus-visible:shadow-[inset_0_0_0_var(--border-s)_var(--color-1-transparent),var(--raised-bevel)] disabled:bg-neutral-3 disabled:bg-none disabled:text-neutral-6 disabled:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4-transparent)]",
        link: "text-primary underline-offset-4 hover:underline disabled:text-neutral-6",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-7 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-2 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
