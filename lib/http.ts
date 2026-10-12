import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { config } from "@/lib/config";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin === new URL(config().appUrl).origin) return;
  // In development the site is also opened from this machine's address on
  // the network (a phone on the same Wi-Fi), whose requests come from that
  // address rather than the app URL: same-site still, so they are let in.
  if (
    process.env.NODE_ENV === "development" &&
    origin &&
    URL.canParse(origin) &&
    new URL(origin).host === request.headers.get("host")
  )
    return;
  throw new HttpError(403, "Please reload this page and try again.");
}
export async function api(fn: () => Promise<unknown>) {
  try {
    return NextResponse.json(await fn(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: "Please check the information you entered." },
        { status: 400 },
      );
    console.error(
      JSON.stringify({
        event: "request_failed",
        kind: error instanceof Error ? error.name : "unknown",
      }),
    );
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
