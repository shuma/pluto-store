import { z } from "zod";
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "auth",
  "checkout",
  "create",
  "dashboard",
  "login",
  "orders",
  "privacy",
  "terms",
  "_next",
  "favicon",
  "robots",
  "sitemap",
] as const;
export const storeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(63)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens.",
  )
  .refine(
    (s) => !RESERVED_SLUGS.some((r) => r === s),
    "This address is reserved.",
  );
