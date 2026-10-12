import { expect, it } from "vitest";
import { loginError } from "@/lib/auth/login-error";

it("distinguishes the email quota from request throttling", () => {
  expect(
    loginError({ code: "over_email_send_rate_limit", status: 429 }),
  ).toMatchObject({
    status: 429,
    message: expect.stringContaining("email sending limit"),
  });
  expect(loginError({ status: 429 })).toMatchObject({
    status: 429,
    message: expect.stringContaining("sign-in requests"),
  });
});
it("explains missing delivery configuration without exposing provider details", () => {
  expect(loginError({ code: "email_address_not_authorized" })).toMatchObject({
    status: 503,
    message: expect.stringContaining("not configured"),
  });
  expect(
    loginError({ code: "unexpected_provider_failure" }).message,
  ).not.toContain("unexpected_provider_failure");
});
