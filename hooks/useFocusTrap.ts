"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null && !el.hasAttribute("aria-hidden")
  );
}

/**
 * Traps focus inside the given container when active, and restores focus to the
 * element that had focus when the trap was activated (e.g. the button that opened the modal).
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  options?: { onEscape?: () => void }
) {
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(options?.onEscape);
  onEscapeRef.current = options?.onEscape;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isActive) {
      if (!isActive && previousActiveRef.current) {
        if (document.body.contains(previousActiveRef.current)) {
          previousActiveRef.current.focus();
        }
        previousActiveRef.current = null;
      }
      return;
    }

    previousActiveRef.current = document.activeElement as HTMLElement | null;

    const focusables = getFocusableElements(container);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (first) first.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;

      const current = document.activeElement as HTMLElement | null;
      if (!current || !container.contains(current)) return;

      if (e.shiftKey) {
        if (current === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (current === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previousActiveRef.current && document.body.contains(previousActiveRef.current)) {
        previousActiveRef.current.focus();
      }
      previousActiveRef.current = null;
    };
  }, [isActive, containerRef]);
}
