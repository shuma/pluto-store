import { SiteHeader, SiteFooter } from "@/components/site-header";
export default function Privacy() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-2xl space-y-6 px-6 py-12">
        <p className="text-sm font-medium text-muted-foreground">
          Pluto · Privacy
        </p>
        <h1 className="font-semibold text-5xl">
          Your moments stay yours.
        </h1>
        <p>
          Pluto processes the photograph you upload to create your artwork and
          fulfill your poster order. Your source photo and generated artwork are
          private. Access is limited using temporary links and a secure browser
          session.
        </p>
        <h2 className="text-xl font-semibold">What we process</h2>
        <p>
          We store your photograph, generated artwork, image permission
          confirmation, and the order information needed to take payment and
          deliver your poster. A necessary cookie connects your browser to your
          artwork. Creators use authentication cookies to manage their stores.
        </p>
        <h2 className="text-xl font-semibold">Service providers</h2>
        <p>
          Supabase stores application data and images. OpenAI processes images
          to create artwork. Stripe handles payment details. Gelato, or our
          manual print fulfillment process, receives the chosen print file and
          delivery details. Vercel hosts the application. We do not use customer
          uploads for training and do not sell customer photographs.
        </p>
        <h2 className="text-xl font-semibold">Retention and access</h2>
        <p>
          Source photographs and unused artwork are marked for deletion after 30
          days by default. Deletion is currently an operational process.
          Purchased print files and order records are retained as needed for
          fulfillment, support, and applicable recordkeeping duties. Store
          owners can see their orders; authorized Pluto operators handle
          fulfillment.
        </p>
        <h2 className="text-xl font-semibold">Your choices</h2>
        <p>
          You can choose not to upload an image. For access or deletion
          requests, contact the store through the contact details accompanying
          your order, including your order reference where relevant. Necessary
          order records may need to be retained.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
