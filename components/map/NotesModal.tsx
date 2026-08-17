"use client";

import { forwardRef } from 'react';
import type { CountryLocation } from '@/types/country';
import { PLACE_LIMITS } from '@/lib/place-validation';

export interface NotesFormState {
  notes: string;
  visitedAt: string;
  tags: string;
}

interface NotesModalProps {
  open: boolean;
  location: CountryLocation | null;
  form: NotesFormState;
  errors: Record<string, string>;
  isSaving: boolean;
  onClose: () => void;
  onFormChange: (next: NotesFormState) => void;
  onSave: () => void;
  onClearError: (field: string) => void;
}

const NotesModal = forwardRef<HTMLDivElement, NotesModalProps>(function NotesModal(
  { open, location, form, errors, isSaving, onClose, onFormChange, onSave, onClearError },
  ref
) {
  if (!open || !location) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-modal-title"
    >
      <div ref={ref} className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="notes-modal-title" className="modal-title">
            Notes and visit date — {location.name}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="notes-tags">Tags (separate with commas)</label>
            <input
              id="notes-tags"
              type="text"
              value={form.tags}
              onChange={(e) => onFormChange({ ...form, tags: e.target.value })}
              placeholder="e.g. color, food, mountains"
              maxLength={PLACE_LIMITS.tagsMaxCount * (PLACE_LIMITS.tagMax + 2)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="notes-visited-at">Visited in (e.g. 2024, 2024-06, or March 2024)</label>
            <input
              id="notes-visited-at"
              type="text"
              value={form.visitedAt}
              onChange={(e) => {
                onFormChange({ ...form, visitedAt: e.target.value });
                onClearError('visitedAt');
              }}
              placeholder="e.g. March 2024"
              maxLength={PLACE_LIMITS.visitedAtMax}
              aria-invalid={!!errors.visitedAt}
              aria-describedby={errors.visitedAt ? 'notes-visited-at-error' : undefined}
            />
            {errors.visitedAt && (
              <p id="notes-visited-at-error" className="form-error" role="alert">
                {errors.visitedAt}
              </p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="notes-text">Notes</label>
            <textarea
              id="notes-text"
              rows={4}
              value={form.notes}
              onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
              placeholder="Memories, places you visited, etc."
              className="form-textarea"
              maxLength={PLACE_LIMITS.notesMax}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn-submit" onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="btn-spinner" aria-hidden />
                <span>Saving...</span>
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default NotesModal;
