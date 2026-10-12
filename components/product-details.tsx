import type { Product } from "@/lib/domain";
import { productDetails } from "@/lib/products/details";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
// What the selected print is made of and how to look after it, collapsed so
// the size choice stays the focus. For EU buyers the safety information stays
// visible beneath it: GPSR asks for it to be shown clearly on the listing.
export function ProductDetails({ product }: { product: Product }) {
  const { features, care, safety } = productDetails(product);
  const list = (items: string[]) => (
    <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
  return (
    <div className="mt-2 rounded-2xl bg-neutral-2 px-4">
      <Accordion type="single" collapsible>
        <AccordionItem value="about">
          <AccordionTrigger className="items-center py-4 hover:no-underline">
            About this print
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            {list(features)}
            <h3 className="mt-4 mb-1 font-medium">Care</h3>
            {list(care)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {safety.length > 0 && (
        <p className="shadow-[inset_0_var(--border-s)_0_var(--border)] py-3 text-2xs text-muted-foreground">
          {safety.map(({ label, value }) => `${label}: ${value}.`).join(" ")}
        </p>
      )}
    </div>
  );
}
