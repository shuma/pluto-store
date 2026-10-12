import { HttpError } from "@/lib/http";

export function loginError(error: { code?: string; status?: number }) {
  if (error.code === "over_email_send_rate_limit")
    return new HttpError(
      429,
      "The email sending limit has been reached. Please wait up to an hour before requesting another link.",
    );
  if (error.status === 429 || error.code === "over_request_rate_limit")
    return new HttpError(
      429,
      "Too many sign-in requests. Please wait a few minutes before trying again.",
    );
  if (error.code === "email_address_not_authorized")
    return new HttpError(
      503,
      "Sign-in email delivery is not configured for this address. Please contact Pluto support.",
    );
  if (error.code === "otp_disabled" || error.code === "signups_not_allowed")
    return new HttpError(
      400,
      "Please use the email address invited to your creator store.",
    );
  return new HttpError(
    503,
    "We couldn’t send your sign-in email right now. Please try again shortly.",
  );
}
