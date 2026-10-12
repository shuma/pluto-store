"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { browserDb } from "@/lib/supabase/client";
import { MAX_UPLOAD_BYTES, imageMime } from "@/lib/validation/schemas";
import { post } from "@/lib/client-api";
// Choosing a photo and starting a creation from it: shared by the store
// page's upload card and the full upload page.
export function usePhotoUpload(slug: string) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const sessionRef = useRef<string | null>(null);
  function choose(next?: File) {
    setError("");
    if (!next) return;
    if (
      !imageMime.safeParse(next.type).success ||
      next.size > MAX_UPLOAD_BYTES
    ) {
      setError("Choose a JPEG, PNG or WebP photo smaller than 10 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    sessionRef.current = null;
  }
  async function submit() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      let id = sessionRef.current;
      if (!id) {
        const upload = await post<{
          sessionId: string;
          path: string;
          uploadToken: string;
        }>("/api/upload", {
          storeSlug: slug,
          mimeType: file.type,
          size: file.size,
        });
        const { error } = await browserDb()
          .storage.from("customer-uploads")
          .uploadToSignedUrl(upload.path, upload.uploadToken, file, {
            contentType: file.type,
          });
        if (error)
          throw new Error(
            "Your upload could not be completed. Please try again.",
          );
        id = upload.sessionId;
        sessionRef.current = id;
      }
      // Completes the upload and starts the round in one request.
      await post("/api/generate", { sessionId: id });
      router.push(`/${slug}/create/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  return { file, preview, busy, error, choose, submit };
}

export function UploadFlow({ slug }: { slug: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { file, preview, busy, error, choose, submit } = usePhotoUpload(slug);
  const [dragging, setDragging] = useState(false);
  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
        The beginning of something personal
      </p>
      <h1 className="font-semibold text-center text-5xl md:text-6xl">
        Choose a photo.
      </h1>
      <p className="mx-auto mb-8 mt-4 max-w-sm text-center text-sm text-muted-foreground">
        Start with a clear photograph you love. We’ll take care of the
        transformation.
      </p>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose a photo"
        onChange={(e) => choose(e.target.files?.[0])}
        disabled={busy}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          choose(e.dataTransfer.files[0]);
        }}
        className={`flex min-h-72 w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 transition-colors ${dragging ? "border-primary bg-accent" : "border-transparent bg-card shadow-sm hover:border-neutral-6"}`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Your selected photograph"
              className="max-h-80 max-w-full object-contain"
            />
            <span className="text-xs underline">Choose a different photo</span>
          </>
        ) : (
          <>
            <Upload size={32} strokeWidth={1.7} className="text-primary" />
            <span className="text-sm">
              Drop your photo here, or <u>browse files</u>
            </span>
            <span className="text-xs text-muted-foreground">
              JPEG, PNG or WebP · Up to 10 MB
            </span>
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mb-4 mt-6 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        className="mt-6 w-full"
        size="lg"
        disabled={!file || busy}
        onClick={submit}
      >
        {busy ? "Preparing your photograph…" : "Create your artwork"}
        {!busy && <ArrowRight size={16} />}
      </Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your photo stays private. By continuing, you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
