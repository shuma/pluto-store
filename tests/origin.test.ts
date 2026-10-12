import { afterEach, expect, it, vi } from "vitest";
import { assertOrigin } from "@/lib/http";

const request = (origin: string | null, host = "localhost:3000") =>
  new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { host, ...(origin ? { origin } : {}) },
  });
afterEach(() => vi.unstubAllEnvs());

it("accepts requests from the app's own address", () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  expect(() => assertOrigin(request("http://localhost:3000"))).not.toThrow();
});
it("refuses other sites and requests without an origin", () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  expect(() => assertOrigin(request("https://evil.example"))).toThrow();
  expect(() => assertOrigin(request(null))).toThrow();
});
it("lets a phone on the same Wi-Fi in during development only", () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  const phone = request("http://192.168.0.219:3000", "192.168.0.219:3000");
  vi.stubEnv("NODE_ENV", "development");
  expect(() => assertOrigin(phone)).not.toThrow();
  // A page on another address can't pass by naming itself.
  expect(() =>
    assertOrigin(request("http://192.168.0.50:3000", "192.168.0.219:3000")),
  ).toThrow();
  vi.stubEnv("NODE_ENV", "production");
  expect(() => assertOrigin(phone)).toThrow();
});
