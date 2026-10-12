import "server-only";
import { z } from "zod";
import { required } from "@/lib/config";
import type { ShippingAddress } from "@/lib/validation/schemas";
export class GelatoSubmissionError extends Error {
  constructor(public uncertain: boolean) {
    super(
      uncertain
        ? "Gelato submission needs reconciliation"
        : "Gelato rejected the order",
    );
  }
}
export type PosterOrderInput = {
  orderId: string;
  // Every print in the order, one parcel to one address.
  items: {
    itemId: string;
    productUid: string;
    printFileUrl: string;
    quantity: number;
  }[];
  currency: string;
  customer: { name: string; email: string };
  shippingAddress: ShippingAddress;
};
export async function createPosterOrder(input: PosterOrderInput) {
  const [firstName, ...rest] = input.customer.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;
  const s = input.shippingAddress;
  // Reject safely before contacting the provider; never silently truncate shipping data.
  const shipping = z
    .object({
      firstName: z.string().min(1).max(25),
      lastName: z.string().min(1).max(25),
      addressLine1: z.string().min(1).max(35),
      addressLine2: z.string().max(35),
      city: z.string().min(1).max(30),
      postCode: z.string().min(1).max(15),
      state: z.string().max(35),
      country: z.string().length(2),
      email: z.email(),
    })
    .parse({
      firstName,
      lastName,
      addressLine1: s.line1,
      addressLine2: s.line2 ?? "",
      city: s.city,
      postCode: s.postal_code,
      state: s.state ?? "",
      country: s.country,
      email: input.customer.email,
    });
  const orderType = z
    .enum(["draft", "order"])
    .parse(process.env.GELATO_ORDER_TYPE ?? "draft");
  const key = required("GELATO_API_KEY");
  let response: Response;
  try {
    response = await fetch(
      `${process.env.GELATO_API_BASE_URL ?? "https://order.gelatoapis.com/v4"}/orders`,
      {
        method: "POST",
        headers: { "X-API-KEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          orderReferenceId: input.orderId,
          customerReferenceId: input.orderId,
          currency: input.currency.toUpperCase(),
          items: input.items.map((item) => ({
            itemReferenceId: item.itemId,
            productUid: item.productUid,
            files: [{ type: "default", url: item.printFileUrl }],
            quantity: item.quantity,
          })),
          shippingAddress: shipping,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch {
    throw new GelatoSubmissionError(true);
  }
  if (!response.ok)
    throw new GelatoSubmissionError(
      response.status >= 500 ||
        response.status === 408 ||
        response.status === 409,
    );
  try {
    return z
      .object({
        id: z.string().min(1),
        fulfillmentStatus: z.string().optional(),
        orderType: z.string().optional(),
      })
      .passthrough()
      .parse(await response.json());
  } catch {
    throw new GelatoSubmissionError(true);
  }
}
