export type AnalyticsEvent =
  | "store_viewed"
  | "upload_started"
  | "upload_completed"
  | "generation_started"
  | "generation_completed"
  | "generation_failed"
  | "artwork_selected"
  | "product_selected"
  | "checkout_started"
  | "purchase_completed"
  | "generation_retried";
// Add a vendor transport here. Never pass customer images, email, cookies or instructions.
export function track(
  event: AnalyticsEvent,
  properties: Record<string, string | number | boolean> = {},
) {
  if (process.env.NODE_ENV === "development")
    console.info(JSON.stringify({ event, ...properties }));
}
