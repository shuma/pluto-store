import { describe, it, expect } from "vitest";
import { paymentFee, payout, platformFee } from "@/lib/fees";

describe("fees", () => {
  it("takes 15% for Pluto, with a minimum per order", () => {
    expect(platformFee(2999, "usd")).toBe(450);
    // $3 minimum on small orders.
    expect(platformFee(1499, "usd")).toBe(300);
    expect(platformFee(39900, "sek")).toBe(5985);
    // 30 kr minimum.
    expect(platformFee(14900, "sek")).toBe(3000);
    // Never more than the sale.
    expect(platformFee(200, "usd")).toBe(200);
  });
  it("estimates card processing at each market's standard rate", () => {
    // 2.9% + $0.30 in the US; 1.5% + 1.80 kr in Sweden.
    expect(paymentFee(2999, "usd")).toBe(117);
    expect(paymentFee(39900, "sek")).toBe(779);
  });
  it("leaves the creator the rest", () => {
    // $29.99 for a 12 × 16 in poster that costs $11.98 delivered.
    expect(payout(2999, 1198, "usd")).toEqual({
      platform: 450,
      payment: 117,
      earnings: 1234,
    });
  });
});
