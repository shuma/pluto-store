import { HandHeart, Leaf, Truck } from "lucide-react";
import type { Product } from "@/lib/domain";
import type { Currency } from "@/lib/currency";
import { productDetails } from "@/lib/products/details";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
// What a customer may want to know before paying, one row each under the
// checkout button: shipping, what the print is made of and how to look after
// it. The row titles carry the promise at a glance; the detail stays
// collapsed so the size choice stays the focus. For EU buyers the safety
// information stays visible beneath: GPSR asks for it to be shown clearly on
// the listing.
export function ProductDetails({
  product,
  currency,
}: {
  product: Product;
  currency: Currency;
}) {
  const { features, certifiedPaper, delivery, care, safety } = productDetails(
    product,
    currency,
  );
  const rows = [
    { value: "shipping", icon: Truck, title: "Free shipping", body: delivery },
    ...(features.length
      ? [
          {
            value: "materials",
            icon: Leaf,
            title: certifiedPaper ? "Sustainably sourced paper" : "Materials",
            body: features,
          },
        ]
      : []),
    {
      value: "care",
      icon: HandHeart,
      title: "Caring for your print",
      body: care,
    },
  ];
  return (
    <div className="mt-5 rounded-2xl bg-neutral-2 px-4">
      <Accordion type="single" collapsible>
        {rows.map(({ value, icon: Icon, title, body }) => (
          <AccordionItem key={value} value={value}>
            <AccordionTrigger className="items-center gap-3 hover:no-underline">
              <Icon className="size-4 shrink-0 text-foreground" aria-hidden />
              {title}
            </AccordionTrigger>
            {/* Indented to the title, past the icon and its gap. */}
            <AccordionContent className="pl-7 text-muted-foreground">
              {typeof body === "string" ? (
                <p>{body}</p>
              ) : (
                <ul className="list-disc space-y-1 pl-4">
                  {body.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {safety.length > 0 && (
        <p className="shadow-[inset_0_var(--border-s)_0_var(--border)] py-3 text-2xs text-muted-foreground">
          {safety.map(({ label, value }) => `${label}: ${value}.`).join(" ")}
        </p>
      )}
    </div>
  );
}
