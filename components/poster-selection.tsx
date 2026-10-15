"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { Lock, Minus, Plus, Trash2, ZoomIn } from "lucide-react";
import { Button } from "./ui/button";
import type { Product } from "@/lib/domain";
import { money } from "@/lib/payments/pricing";
import { post, send } from "@/lib/client-api";
import type { CartItem } from "@/lib/cart/cart";
import {
  cartCount,
  cartTotal,
  MAX_PER_ITEM,
  MAX_PER_ORDER,
} from "@/lib/cart/rules";
import {
  isFramed,
  nameAndSize,
  productKind,
} from "@/lib/products/catalog";
import { productDetails } from "@/lib/products/details";
import { cn } from "@/lib/utils";
import { PaymentMethods } from "./payment-methods";
import { ProductSticker } from "./product-pictograms";
import { PreviewViewer, type ViewerItem } from "./preview-viewer";
import { ProductDetails } from "./product-details";
// The quantity stepper's minus and plus: ghost icon buttons, round and a step
// smaller to sit inside the pill.
const STEP = "size-8 rounded-full";
export function PosterSelection({
  products,
  artworkUrl,
  sessionId,
  artworkId,
  initialCart,
}: {
  products: Product[];
  artworkUrl: string;
  sessionId: string;
  artworkId: string;
  // What the visit already has in its cart for this artwork, as the server
  // holds it.
  initialCart: CartItem[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    // Room mockups that have arrived, or failed, by product. Until the chosen
    // one arrives (or if it can't be drawn) the plain wall below shows.
    [loaded, setLoaded] = useState<string[]>([]),
    [failed, setFailed] = useState<string[]>([]),
    // The print in a room, or the artwork alone, as it will be cut to the
    // chosen print's shape.
    [chosenView, setView] = useState<"room" | "artwork">("artwork"),
    // Which view is open full size, if any.
    [enlarged, setEnlarged] = useState<string | null>(null),
    [cart, setCart] = useState(initialCart),
    [cartBusy, setCartBusy] = useState(false);
  const add = (id: string) => (ids: string[]) =>
    ids.includes(id) ? ids : [...ids, id];
  const markLoaded = (id: string) => setLoaded(add(id)),
    markFailed = (id: string) => setFailed(add(id));
  const product = products.find((p) => p.id === productId);
  const mockupSrc = (id: string) =>
    `/api/mockups?${new URLSearchParams({ session: sessionId, artwork: artworkId, product: id })}`;
  // The mock-up grows with the print: the largest fills two thirds of the
  // wall, the rest scale down by their size so the difference reads.
  const largest = Math.max(...products.map((p) => p.width_mm * p.height_mm));
  const mockWidth = product
    ? Math.max(
        36,
        66 * Math.sqrt((product.width_mm * product.height_mm) / largest),
      )
    : 55;
  // The artwork alone shrinks with the print the same way: the largest fills
  // the box (--fill: 89% of it on wide screens), smaller ones by their size,
  // never below 40%.
  const artScale = product
    ? Math.max(0.4, Math.sqrt((product.width_mm * product.height_mm) / largest))
    : 1;
  // Changes the cart on the server and shows what it now holds. `guess` is
  // shown straight away and undone if the server says no.
  async function changeCart(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
    guess?: CartItem[],
  ) {
    const before = cart;
    if (guess) setCart(guess);
    setCartBusy(true);
    setError("");
    try {
      const { items } = await send<{ items: CartItem[] }>(method, "/api/cart", {
        sessionId,
        artworkId,
        ...body,
      });
      setCart(items);
      return items;
    } catch (e) {
      setCart(before);
      setError(
        e instanceof Error ? e.message : "Your cart couldn’t be updated.",
      );
      return null;
    } finally {
      setCartBusy(false);
    }
  }
  const addSelected = () => changeCart("POST", { productId });
  async function checkout() {
    setBusy(true);
    setError("");
    // With nothing in the cart, checking out buys the size on screen.
    if (!cart.length && !(await addSelected())) {
      setBusy(false);
      return;
    }
    try {
      const { url } = await post<{ url: string }>("/api/checkout", {
        sessionId,
        artworkId,
      });
      window.location.assign(url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Checkout is unavailable. Please try again.",
      );
      setBusy(false);
    }
  }
  const currency = products[0]?.currency ?? cart[0]?.product.currency ?? "usd";
  const count = cartCount(cart);
  const total = cart.length ? cartTotal(cart) : (product?.price_amount ?? null);
  const framed = isFramed(product?.gelato_catalog);
  // "Framed" or "Unframed" only tells options apart when the store sells both.
  const mixed =
    new Set(products.map((p) => isFramed(p.gelato_catalog))).size > 1;
  const areas = products.map((p) => p.width_mm * p.height_mm),
    largestArea = Math.max(...areas),
    smallestArea = Math.min(...areas);
  const ratio = product ? product.width_mm / product.height_mm : 0.707;
  // Full size: the room mockup once it has arrived, and the artwork alone.
  const hasRoom = Boolean(
    product && loaded.includes(product.id) && !failed.includes(product.id),
  );
  // A print whose mockup couldn't be drawn has only its artwork to show.
  const roomFailed = Boolean(product && failed.includes(product.id));
  const view = roomFailed ? "artwork" : chosenView;
  // The room thumbnail is the chosen print's mockup, the same file as the
  // large view, so it loads once.
  const thumbs = [
    { value: "artwork" as const, label: "Artwork only", src: artworkUrl },
    ...(!roomFailed
      ? [
          {
            value: "room" as const,
            label: "On a wall",
            src: mockupSrc(productId),
          },
        ]
      : []),
  ];
  const viewerItems: ViewerItem[] = [
    { id: "artwork", url: artworkUrl, aspect: ratio },
    ...(hasRoom ? [{ id: "room", url: mockupSrc(productId), aspect: 1 }] : []),
  ];
  return (
    <div className="grid gap-6 md:grid-cols-[1.25fr_.75fr] md:items-start md:gap-12 lg:gap-20">
      {/* One stage holds everything: the view, and the thumbnails that pick
          it, inset in the empty band beside a portrait print. Never taller
          than the screen leaves room for. */}
      <div className="md:sticky md:top-24">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-paper-shell [container-type:size] md:w-[min(100%,calc(100dvh-8rem))]">
          <div className="absolute bottom-0 h-[16%] w-full bg-neutral-3" />
          <img
            src={artworkUrl}
            alt="Your artwork shown as a poster"
            style={{
              aspectRatio: `${ratio}`,
              // Also capped by the wall's height, so a tall print still fits
              // whole on the square phone preview.
              width: `min(${mockWidth}%, ${(78 * ratio).toFixed(1)}cqh)`,
            }}
            className={cn(
              "relative object-cover shadow-[0_12px_28px_-10px_rgb(0_0_0/0.35)] transition-[width] motion-large",
              framed &&
                "border-[8px] border-foreground/85 bg-background p-[6%]",
            )}
          />
          {/* Every size's room mockup at once, so changing size crossfades
            to one the browser already has. */}
          {products
            .filter((p) => !failed.includes(p.id))
            .map((p) => (
              <img
                key={p.id}
                src={mockupSrc(p.id)}
                alt=""
                aria-hidden
                draggable={false}
                onLoad={() => markLoaded(p.id)}
                onError={() => markFailed(p.id)}
                // A cached mockup can finish before hydration attaches the
                // handlers above, so its load event is never seen: read the
                // image's own state when it mounts too.
                ref={(img) => {
                  if (img?.complete)
                    (img.naturalWidth ? markLoaded : markFailed)(p.id);
                }}
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity motion-large",
                  p.id === productId && loaded.includes(p.id)
                    ? "opacity-100"
                    : "opacity-0",
                )}
              />
            ))}
          <div
            aria-hidden={view !== "artwork"}
            className={cn(
              // Room below for the thumbnail row on phones.
              "absolute inset-0 flex items-center justify-center bg-paper-shell transition-opacity [--fill:88] md:[--fill:89] motion-large",
              view === "artwork"
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            )}
          >
            <img
              src={artworkUrl}
              alt="Your artwork, cut to the chosen print size"
              draggable={false}
              style={{
                aspectRatio: `${ratio}`,
                width: `min(calc(var(--fill) * ${artScale.toFixed(3)} * 1%), calc(var(--fill) * ${(ratio * artScale).toFixed(3)} * 1cqh))`,
              }}
              className="object-cover shadow-[0_10px_24px_-12px_rgb(0_0_0/0.3)] transition-[width] motion-large"
            />
          </div>
          <button
            type="button"
            aria-label="Enlarge preview"
            onClick={() =>
              setEnlarged(view === "room" && hasRoom ? "room" : "artwork")
            }
            className="group absolute inset-0 cursor-zoom-in rounded-3xl focus-visible:-outline-offset-4 focus-ring"
          >
            {/* Small, and on devices with a pointer shown only on hover or
              focus: the zoom cursor already says the image enlarges. */}
            <span className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-background/80 text-foreground/80 shadow-sm backdrop-blur transition-opacity group-focus-visible:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100">
              <ZoomIn className="size-3.5" aria-hidden />
            </span>
          </button>
          <PreviewViewer
            items={viewerItems}
            openId={enlarged}
            onOpenChange={setEnlarged}
            label="Preview"
          />
          <div
            role="group"
            aria-label="Preview"
            className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 md:top-4 md:left-4 md:gap-2"
          >
            {thumbs.map(({ value, label, src }) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={view === value}
                onClick={() => setView(value)}
                // A border, not an outer ring, marks the chosen one, so both
                // stay the same size and in line. White reads on the room.
                className={cn(
                  "size-11 shrink-0 overflow-hidden rounded-lg border-2 md:size-14 md:rounded-xl bg-paper-shell shadow-md transition-colors focus-ring focus-visible:outline-offset-2",
                  view === value
                    ? "border-foreground"
                    : "border-background hover:border-neutral-6",
                )}
              >
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Choose your prints
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Printed to order and delivered to your door. Shipping included.
        </p>
        {/* Each size is its own line of the cart: tap a row to preview it,
            "Add" to buy it, then the stepper for copies. */}
        <fieldset className="mt-8">
          <legend className="sr-only">Prints</legend>
          <div className="space-y-2">
            {products.map((p) => {
              // Bigger prints get bigger stickers: the smallest size here at
              // 80%, the largest at full size.
              const area = p.width_mm * p.height_mm,
                span = largestArea - smallestArea,
                size = span ? 0.8 + (0.2 * (area - smallestArea)) / span : 1;
              const on = p.id === productId,
                { summary } = productDetails(p),
                line = cart.find((i) => i.product.id === p.id),
                { title, size: printSize } = nameAndSize(
                  p.name,
                  p.width_mm,
                  p.height_mm,
                ),
                quantity = line?.quantity ?? 0,
                full = count >= MAX_PER_ORDER;
              return (
                <motion.div
                  key={p.id}
                  initial={false}
                  animate="rest"
                  whileHover="hover"
                  onClick={() => setProductId(p.id)}
                  className={cn(
                    "flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl ring-1 ring-neutral-6-transparent bg-background px-4 py-3 transition-[box-shadow,border-color] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2",
                    on ? "ring-2 ring-foreground" : "hover:ring-neutral-6",
                  )}
                >
                  <ProductSticker
                    kind={productKind(p.gelato_catalog, p.width_mm, p.height_mm)}
                    size={size}
                    selected={on}
                    className="size-10"
                  />
                  <label className="min-w-0 flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="product"
                      value={p.id}
                      checked={on}
                      onChange={() => setProductId(p.id)}
                      aria-label={`Preview ${p.name}`}
                      className="sr-only"
                    />
                    <span className="block text-sm font-medium">
                      {title}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {printSize}
                      </span>
                    </span>
                    {mixed && (
                      <span className="block text-xs text-muted-foreground">
                        {isFramed(p.gelato_catalog) ? "Framed" : "Unframed"}
                      </span>
                    )}
                    {summary && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {summary}
                      </span>
                    )}
                    {p.description && on && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {p.description}
                      </span>
                    )}
                  </label>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {money(p.price_amount, p.currency)}
                    </span>
                    {quantity === 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled={cartBusy || busy || full}
                        onClick={() => {
                          setProductId(p.id);
                          changeCart("POST", { productId: p.id }, [
                            ...cart,
                            {
                              id: `adding-${p.id}`,
                              artworkId,
                              artworkUrl,
                              product: p,
                              quantity: 1,
                              unitAmount: p.price_amount,
                            },
                          ]);
                        }}
                        aria-label={`Add ${p.name}`}
                        className="h-8 gap-1 rounded-full px-3 text-xs"
                      >
                        <Plus className="size-3.5" aria-hidden />
                        Add
                      </Button>
                    ) : (
                      <div className="flex h-8 items-center rounded-full ring-1 ring-neutral-6-transparent bg-background">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          disabled={cartBusy || busy}
                          onClick={() =>
                            quantity === 1
                              ? changeCart(
                                  "DELETE",
                                  { itemId: line!.id },
                                  cart.filter((i) => i.id !== line!.id),
                                )
                              : changeCart(
                                  "PATCH",
                                  { itemId: line!.id, quantity: quantity - 1 },
                                  cart.map((i) =>
                                    i.id === line!.id
                                      ? { ...i, quantity: quantity - 1 }
                                      : i,
                                  ),
                                )
                          }
                          aria-label={
                            quantity === 1
                              ? `Remove ${p.name}`
                              : `One fewer ${p.name}`
                          }
                          className={STEP}
                        >
                          {quantity === 1 ? (
                            <Trash2 className="size-3.5" aria-hidden />
                          ) : (
                            <Minus className="size-3.5" aria-hidden />
                          )}
                        </Button>
                        <span
                          aria-live="polite"
                          className="w-6 text-center text-sm font-medium tabular-nums"
                        >
                          {quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          disabled={
                            cartBusy || busy || quantity >= MAX_PER_ITEM || full
                          }
                          onClick={() =>
                            changeCart(
                              "PATCH",
                              { itemId: line!.id, quantity: quantity + 1 },
                              cart.map((i) =>
                                i.id === line!.id
                                  ? { ...i, quantity: quantity + 1 }
                                  : i,
                              ),
                            )
                          }
                          aria-label={`One more ${p.name}`}
                          className={STEP}
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </fieldset>
        {!products.length && (
          <p className="mt-4 text-sm">
            No print sizes are available right now.
          </p>
        )}
        {/* Held at the bottom of a phone screen, with the price on the button. */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 bg-gradient-to-t from-paper from-70% to-transparent px-4 pt-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:mt-4 md:static md:mx-0 md:bg-none md:px-0">
          <Button
            size="lg"
            className="h-13 w-full rounded-2xl text-base"
            disabled={(!product && !cart.length) || busy || cartBusy}
            onClick={checkout}
          >
            {busy ? (
              "Opening secure checkout…"
            ) : (
              <>
                <Lock aria-hidden />
                Checkout
                {count > 0 && (
                  <span className="tabular-nums">
                    · {count} {count === 1 ? "print" : "prints"}
                  </span>
                )}
                {total !== null && (
                  <span className="tabular-nums">
                    · {money(total, currency)}
                  </span>
                )}
              </>
            )}
          </Button>
          {error && (
            <p
              className="mt-3 text-center text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
        {/* Below the pinned button on a phone, so the bar stays slim. */}
        <PaymentMethods className="mt-3" />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Secure payment by Stripe
        </p>
        {product && <ProductDetails product={product} />}
      </div>
    </div>
  );
}
