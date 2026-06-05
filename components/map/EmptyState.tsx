"use client";

function EmptyStateMapIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export interface EmptyStateProps {
  message: string;
  hint?: string;
  onAddCountry?: () => void;
  isAdding?: boolean;

  variant?: "inline" | "hero";
  primaryCta?: boolean;
  className?: string;
}

export default function EmptyState({
  message,
  hint,
  onAddCountry,
  isAdding = false,
  variant = "hero",
  primaryCta = false,
  className,
}: EmptyStateProps) {
  const rootClass = [
    "app-empty-state",
    variant === "inline" ? "app-empty-state--inline" : "app-empty-state--hero",
    primaryCta ? "app-empty-state--first-use" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} role="status" aria-live="polite">
      {!primaryCta ? (
        <div className="app-empty-state-icon" aria-hidden>
          <EmptyStateMapIcon size={variant === "inline" ? 40 : 48} />
        </div>
      ) : null}
      <p className="app-empty-state-message">{message}</p>
      {hint ? <p className="app-empty-state-hint">{hint}</p> : null}
      {onAddCountry ? (
        <button
          type="button"
          className={`empty-state-cta${primaryCta ? " empty-state-cta--primary" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onAddCountry();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={isAdding}
          aria-label={isAdding ? "Adding country…" : "Add country"}
          aria-busy={isAdding}
        >
          {isAdding ? (
            <>
              <span className="btn-spinner" aria-hidden />
              <span>Adding…</span>
            </>
          ) : primaryCta ? (
            <span>Add country</span>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add country</span>
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
