import "server-only";
import { z } from "zod";
export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
export const config = () =>
  z
    .object({
      appUrl: z.url(),

      fulfillmentMode: z.enum(["manual", "gelato"]),
      alternatives: z.coerce.number().int().min(1).max(4),
      maxRounds: z.coerce.number().int().min(1).max(10),
      retentionDays: z.coerce.number().int().min(1).max(365),
      minPrintDpi: z.coerce.number().min(72).max(600),
      maxPrintUpscale: z.coerce.number().min(1).max(2),
    })
    .parse({
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

      fulfillmentMode: process.env.FULFILLMENT_MODE ?? "manual",
      alternatives: process.env.GENERATION_ALTERNATIVES ?? 3,
      maxRounds: process.env.MAX_GENERATION_ROUNDS ?? 2,
      retentionDays: process.env.RETENTION_DAYS ?? 30,
      minPrintDpi: process.env.MIN_PRINT_DPI ?? 144,
      maxPrintUpscale: process.env.MAX_PRINT_UPSCALE ?? 1.5,
    });
