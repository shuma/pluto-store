// The cards checkout takes, as small marks under the pay button, so a
// customer knows before they leave the page that their card works. Drawn
// inline at one size so they line up and never load late.
const MARK = "h-6 w-[38px] shrink-0 rounded-sm";

function Visa() {
  return (
    <svg viewBox="0 0 38 24" className={MARK} role="img" aria-label="Visa">
      <rect width="38" height="24" rx="4" fill="#1434CB" />
      <text
        x="19"
        y="16"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="10"
        fontStyle="italic"
        fontWeight="800"
        letterSpacing=".2"
      >
        VISA
      </text>
    </svg>
  );
}

function Mastercard() {
  return (
    <svg
      viewBox="0 0 38 24"
      className={MARK}
      role="img"
      aria-label="Mastercard"
    >
      <rect width="38" height="24" rx="4" fill="#252525" />
      <circle cx="15" cy="12" r="7" fill="#EB001B" />
      <circle cx="23" cy="12" r="7" fill="#F79E1B" />
      <path d="M19 6.2a7 7 0 0 1 0 11.6 7 7 0 0 1 0-11.6Z" fill="#FF5F00" />
    </svg>
  );
}

function Maestro() {
  return (
    <svg viewBox="0 0 38 24" className={MARK} role="img" aria-label="Maestro">
      <rect
        x=".5"
        y=".5"
        width="37"
        height="23"
        rx="3.5"
        fill="#fff"
        stroke="#E5E5E5"
      />
      <circle cx="15" cy="12" r="7" fill="#EB001B" />
      <circle cx="23" cy="12" r="7" fill="#00A2E5" />
      <path d="M19 6.2a7 7 0 0 1 0 11.6 7 7 0 0 1 0-11.6Z" fill="#7375CF" />
    </svg>
  );
}

function Amex() {
  return (
    <svg
      viewBox="0 0 38 24"
      className={MARK}
      role="img"
      aria-label="American Express"
    >
      <rect width="38" height="24" rx="4" fill="#1F72CD" />
      <text
        x="19"
        y="15.5"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7.5"
        fontWeight="800"
        letterSpacing=".3"
      >
        AMEX
      </text>
    </svg>
  );
}

export function PaymentMethods({ className }: { className?: string }) {
  return (
    <div
      className={
        "flex items-center justify-center gap-1 " + (className ?? "")
      }
    >
      <Visa />
      <Mastercard />
      <Maestro />
      <Amex />
      <span
        title="Apple Pay and Google Pay"
        className="grid h-6 shrink-0 place-items-center rounded-sm ring-1 ring-neutral-6-transparent bg-background px-2 text-2xs font-medium text-muted-foreground"
      >
        <span aria-hidden>+2</span>
        <span className="sr-only">Apple Pay and Google Pay</span>
      </span>
    </div>
  );
}
