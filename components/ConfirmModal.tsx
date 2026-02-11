"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const previousActiveRef = React.useRef<HTMLElement | null>(null);

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  React.useEffect(() => {
    if (!open) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => {
      if (previousActiveRef.current && document.body.contains(previousActiveRef.current)) {
        previousActiveRef.current.focus();
      }
      previousActiveRef.current = null;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  const content = open ? (
    <div
      ref={overlayRef}
      className="confirm-modal-overlay"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div className={`confirm-modal confirm-modal-${variant}`} onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-modal-title" className="confirm-modal-title">{title}</h2>
        <p id="confirm-modal-desc" className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button ref={cancelRef} type="button" className="confirm-modal-cancel" onClick={handleCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-modal-confirm" onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
