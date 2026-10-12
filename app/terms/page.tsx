import { SiteHeader, SiteFooter } from "@/components/site-header";
export default function Terms() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-2xl space-y-6 px-6 py-12">
        <p className="text-sm font-medium text-muted-foreground">
          Pluto · Terms
        </p>
        <h1 className="font-semibold text-5xl">
          Made with permission.
        </h1>
        <p>
          Pluto lets you transform an authorized photograph through a
          creator-approved visual identity and purchase a physical poster.
          Review your chosen artwork and size before continuing to checkout.
        </p>
        <h2 className="text-xl font-semibold">Your images</h2>
        <p>
          Only upload photographs you own or have permission to use, including
          appropriate permission from people depicted. Do not upload unlawful,
          exploitative, or infringing material. You authorize Pluto and its
          service providers to process your image solely to provide the creation
          and printing service.
        </p>
        <h2 className="text-xl font-semibold">Creator participation</h2>
        <p>
          Creators must have the right to license all reference artwork and
          visual direction they provide to Pluto. A creator’s participation does
          not transfer ownership of their original artwork to a customer.
        </p>
        <h2 className="text-xl font-semibold">Artwork and orders</h2>
        <p>
          Each transformation is unique. Review the result carefully: details
          and colors can differ from the source image, screen display, and
          physical print. Product size and the total price are shown before
          payment. Posters are unframed unless expressly stated. Payment
          confirmation comes from our payment provider.
        </p>
        <h2 className="text-xl font-semibold">Delivery and support</h2>
        <p>
          Posters are made to order. Delivery timing depends on production and
          shipping availability. For a damaged, incorrect, or missing order, use
          the support contact supplied with your order and include the order
          reference. These terms do not limit any mandatory consumer rights.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
