"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowUpRight, ImageUp } from "lucide-react";
import { storeSchema } from "@/lib/validation/schemas";
import type { Store } from "@/lib/domain";
import { uploadCreatorAsset } from "@/lib/client-upload";
import { post } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { ExampleArtwork } from "./example-artwork";
import { FIELD, Field } from "./form-field";
import { Panel, PANEL_INSET } from "./panel";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { PREVIEW_READY } from "./preview-ready";

const DESCRIPTION_MAX = 400;
const VISIBILITY = [
  { value: "draft", label: "Draft", hint: "Only you can see it" },
  { value: "live", label: "Live", hint: "Open for orders" },
  { value: "disabled", label: "Paused", hint: "Hidden from all" },
] as const;

type Values = z.input<typeof storeSchema>;

export function StoreEditor({
  store,
  examples,
  productCount,
}: {
  store: Store | null;
  examples: ComponentProps<typeof ExampleArtwork>["examples"];
  productCount: number;
}) {
  const router = useRouter(),
    [message, setMessage] = useState(""),
    [version, setVersion] = useState(0),
    [focused, setFocused] = useState<string | null>(null);
  const reloadPreview = () => setVersion((v) => v + 1);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values, unknown, z.output<typeof storeSchema>>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: store?.name ?? "",
      slug: store?.slug ?? "",
      description: store?.description ?? "",
      status: store?.status ?? "draft",
    },
  });
  const values = useWatch({ control }) as Values;
  const descriptionLength = values.description?.length ?? 0;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Store details">
        <form
          id="store-editor"
          className={cn(PANEL_INSET, "space-y-8 p-6 sm:p-8")}
          onFocus={(e) => setFocused(e.target.getAttribute("name"))}
          onBlur={() => setFocused(null)}
          onSubmit={handleSubmit(async (data) => {
            setMessage("");
            try {
              await post("/api/creator/store", data);
              reset(data);
              toast(store ? "Changes saved" : "Your store is ready");
              router.refresh();
              reloadPreview();
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Could not save. Try again.",
              );
            }
          })}
        >
          <AvatarField
            store={store}
            name={values.name}
            onUploaded={reloadPreview}
          />
          <Field
            id="name"
            label="Store name"
            hint="Shown at the top of your store and on every order."
            error={errors.name?.message}
          >
            <input
              id="name"
              placeholder="e.g. High Elf Club"
              autoComplete="organization"
              aria-invalid={!!errors.name}
              className={cn(FIELD, "h-12")}
              {...register("name")}
            />
          </Field>
          <Field
            id="slug"
            label="Store address"
            hint="Lowercase letters, numbers and hyphens. Changing it breaks old links."
            error={errors.slug?.message}
          >
            <div
              className={cn(
                FIELD,
                "flex h-12 items-center px-0 focus-within:shadow-[inset_0_0_0_var(--border-s)_var(--color-1-transparent),var(--surface-recessed-shadow)] has-[:focus-visible]:[outline:var(--focus-ring-outline)]",
                errors.slug && "shadow-[inset_0_0_0_var(--border-s)_var(--error),var(--surface-recessed-shadow)]",
              )}
            >
              <span className="select-none pl-4 text-muted-foreground">
                pluto.store/
              </span>
              <input
                id="slug"
                placeholder="your-store"
                spellCheck={false}
                autoCapitalize="none"
                aria-invalid={!!errors.slug}
                className="h-full min-w-0 flex-1 bg-transparent pr-4 outline-none placeholder:text-muted-foreground"
                {...register("slug")}
              />
            </div>
          </Field>
          <Field
            id="description"
            label="Short description"
            hint="One or two sentences telling customers what you make."
            error={errors.description?.message}
            aside={
              <span
                className={cn(
                  "tabular-nums",
                  descriptionLength > DESCRIPTION_MAX && "text-destructive",
                )}
              >
                {descriptionLength}/{DESCRIPTION_MAX}
              </span>
            }
          >
            <textarea
              id="description"
              rows={4}
              placeholder="Turn a photo you love into a one-of-a-kind illustrated poster."
              aria-invalid={!!errors.description}
              className={cn(FIELD, "min-h-32 resize-y py-3")}
              {...register("description")}
            />
          </Field>
          {store && (
            <ExampleArtwork examples={examples} onChange={reloadPreview} />
          )}
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Visibility</legend>
            <p className="mb-3 text-sm text-muted-foreground">
              {productCount ? (
                "Keep it in draft until everything looks right."
              ) : (
                <>
                  Add a product before going live.{" "}
                  <Link
                    href="/dashboard/store/products"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Add a product
                  </Link>
                </>
              )}
            </p>
            {store?.status === "live" && store.payouts_status !== "enabled" && (
              <p className="mb-3 rounded-xl bg-warning-transparent text-neutral-10 px-4 py-3 text-sm">
                You’re live, but we can’t pay you yet.{" "}
                <Link
                  href="/dashboard/settings"
                  className="font-medium underline underline-offset-4"
                >
                  Set up payouts
                </Link>
                . Your earnings are kept until you do.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              {VISIBILITY.map((option) => {
                // Nothing to buy means no going live; a store that is
                // already live keeps the option so saving still works.
                const locked =
                  option.value === "live" &&
                  !productCount &&
                  store?.status !== "live";
                return (
                  <label
                    key={option.value}
                    aria-disabled={locked}
                    className="cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:text-neutral-6 rounded-xl ring-1 ring-input bg-background px-4 py-3 transition-colors hover:bg-neutral-2 has-checked:ring-foreground has-checked:ring-1 has-checked:ring-foreground focus-ring"
                  >
                    <input
                      type="radio"
                      value={option.value}
                      disabled={locked}
                      className="sr-only"
                      {...register("status")}
                    />
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          option.value === "live"
                            ? "bg-success"
                            : option.value === "draft"
                              ? "bg-warning"
                              : "bg-neutral-5",
                        )}
                      />
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </form>
        <SaveBar
          store={store}
          dirty={isDirty}
          submitting={isSubmitting}
          message={message}
          onDiscard={() => {
            reset();
            setMessage("");
          }}
        />
      </Panel>
      <Panel
        title="Preview"
        // Sticky so it stays beside whichever field is being edited.
        className="flex flex-col lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:self-start"
        actions={
          store && (
            <>
              <p className="text-sm text-muted-foreground">
                {isDirty
                  ? "Showing unsaved changes"
                  : "Your store as customers see it"}
              </p>
              <a
                href={`/${store.slug}${store.status === "live" ? "" : "?preview=1"}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
              >
                Open <ArrowUpRight className="size-3.5" />
              </a>
            </>
          )
        }
      >
        {store ? (
          <StorePreview
            store={store}
            version={version}
            draft={{ name: values.name, description: values.description }}
            focused={focused}
            slug={values.slug || store.slug}
          />
        ) : (
          <div
            className={cn(
              PANEL_INSET,
              "grid min-h-[36rem] flex-1 place-items-center p-8 text-center text-sm text-muted-foreground",
            )}
          >
            Create your store and its preview will appear here.
          </div>
        )}
      </Panel>
    </div>
  );
}

// Sits at the foot of the form and sticks to the bottom of the screen, so
// saving is always a glance away. It only lifts into a floating bar with
// actions when there is something to save.
function SaveBar({
  store,
  dirty,
  submitting,
  message,
  onDiscard,
}: {
  store: Store | null;
  dirty: boolean;
  submitting: boolean;
  message: string;
  onDiscard: () => void;
}) {
  const active = dirty || !store;
  return (
    <div
      className={cn(
        "mt-1 flex min-h-14 flex-wrap items-center justify-end gap-2 rounded-2xl ring-1 px-2 py-2 transition-[background-color,box-shadow] motion-small",
        // Pinned to the viewport only while there is something to save; once
        // saved, the status sits in place at the end of the form.
        active
          ? "sticky bottom-3 z-10 ring-neutral-6-transparent bg-background shadow-lg"
          : "ring-transparent bg-transparent",
      )}
    >
      <p
        role="status"
        className={cn(
          "mr-auto pl-2 text-sm",
          message ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {message ||
          (!store ? "" : dirty ? "Unsaved changes" : "All changes saved")}
      </p>
      {store && dirty && (
        <Button
          type="button"
          variant="ghost"
          disabled={submitting}
          onClick={onDiscard}
        >
          Discard
        </Button>
      )}
      {active && (
        <Button
          type="submit"
          form="store-editor"
          className="h-10 rounded-xl px-6"
          disabled={submitting}
        >
          {submitting ? "Saving…" : store ? "Save changes" : "Create store"}
        </Button>
      )}
    </div>
  );
}

function AvatarField({
  store,
  name,
  onUploaded,
}: {
  store: Store | null;
  name?: string;
  onUploaded: () => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div className="flex items-center gap-4">
      <Avatar
        url={store?.avatar_url}
        name={name}
        className="size-20 text-3xl"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">Profile photo</p>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          {message ||
            (store
              ? "A square JPEG, PNG or WebP, up to 10 MB."
              : "Create your store first, then add a photo.")}
        </p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Upload a profile photo"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setMessage("");
            try {
              await uploadCreatorAsset("avatar", file);
              toast("Profile photo updated");
              router.refresh();
              onUploaded();
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Upload failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!store || busy}
          onClick={() => input.current?.click()}
        >
          <ImageUp data-icon="inline-start" />
          {busy
            ? "Uploading…"
            : store?.avatar_url
              ? "Replace photo"
              : "Upload photo"}
        </Button>
      </div>
    </div>
  );
}

function Avatar({
  url,
  name,
  className,
}: {
  url?: string | null;
  name?: string;
  className?: string;
}) {
  return url ? (
    <img
      src={url}
      alt=""
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  ) : (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold",
        className,
      )}
    >
      {name?.trim().slice(0, 1).toUpperCase() || "P"}
    </span>
  );
}

// The real storefront in an iframe, laid out at a phone's size (where most
// customers see it) and scaled to fit the panel: the preview is the page
// customers get rather than a copy that can drift from it. `version`
// reloads it after each save or upload;
// between saves the unsaved name and description are written straight into
// the page's `data-preview` marks, and the one being edited is highlighted.
const HIGHLIGHT = "rgb(250 204 21 / 0.35)";
// An everyday phone screen, in CSS pixels.
const PHONE = { width: 390, height: 844 };
// Room kept around the phone inside the panel.
const PHONE_MARGIN = 24;
// The address line under the phone, and the gap above it.
const URL_LINE = 28;
type Draft = { name?: string; description?: string };
function StorePreview({
  store,
  version,
  draft,
  focused,
  slug,
}: {
  store: Store;
  version: number;
  draft: Draft;
  focused: string | null;
  slug: string;
}) {
  const frame = useRef<HTMLDivElement>(null),
    iframe = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 }),
    [loadedKey, setLoadedKey] = useState("");
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // Keyed so a reload hides the stale page until the new one has loaded.
  const key = `${store.slug}-${version}`,
    loaded = loadedKey === key;
  // Same origin, so the page is reachable directly; it is static server
  // output, so nothing re-renders over these writes.
  const marks = () =>
    loaded
      ? [
          ...(iframe.current?.contentDocument?.querySelectorAll<HTMLElement>(
            "[data-preview]",
          ) ?? []),
        ]
      : [];
  useEffect(() => {
    for (const el of marks()) {
      el.textContent = draft[el.dataset.preview as keyof Draft] ?? "";
      const active = el.dataset.preview === focused;
      el.style.transition = "background-color 200ms, box-shadow 200ms";
      el.style.borderRadius = "6px";
      el.style.backgroundColor = active ? HIGHLIGHT : "";
      el.style.boxShadow = active ? `0 0 0 6px ${HIGHLIGHT}` : "";
    }
  });
  useEffect(() => {
    marks()
      .find((el) => el.dataset.preview === focused && el.offsetParent)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, loaded]);
  // Never larger than life, and small enough to fit whole.
  const scale = Math.min(
    1,
    (size.width - PHONE_MARGIN * 2) / PHONE.width,
    (size.height - PHONE_MARGIN * 2 - URL_LINE) / PHONE.height,
  );
  return (
    <div
      ref={frame}
      className={cn(
        PANEL_INSET,
        "relative grid min-h-[34rem] flex-1 place-items-center",
      )}
    >
      {scale > 0 && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative overflow-hidden border-[5px] border-foreground/85 bg-background shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)]"
            style={{
              width: PHONE.width * scale + 10,
              height: PHONE.height * scale + 10,
              borderRadius: 44 * scale + 5,
            }}
          >
            {!loaded && (
              <Skeleton className="absolute inset-3 rounded-2xl bg-neutral-3" />
            )}
            <iframe
              key={key}
              ref={iframe}
              src={`/${store.slug}?preview=1`}
              title={`Preview of ${store.name} on a phone`}
              // "Loaded" means hydrated, not just the load event: writing into
              // the page before React has hydrated it causes a mismatch and
              // gets overwritten. A page that never signals (a script error)
              // is shown anyway after a few seconds.
              onLoad={(e) => {
                const win = e.currentTarget.contentWindow;
                const ready = () => setLoadedKey(key);
                if (win?.document.documentElement.dataset.previewReady) ready();
                else {
                  win?.addEventListener(PREVIEW_READY, ready, { once: true });
                  setTimeout(ready, 4000);
                }
              }}
              className={cn(
                "absolute top-0 left-0 origin-top-left border-0 transition-opacity motion-large",
                loaded ? "opacity-100" : "opacity-0",
              )}
              style={{
                width: PHONE.width,
                height: PHONE.height,
                transform: `scale(${scale})`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">pluto.store/{slug}</p>
        </div>
      )}
    </div>
  );
}
