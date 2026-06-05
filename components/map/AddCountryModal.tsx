"use client";

import { forwardRef } from 'react';
import { getStatusDisplayLabel } from './utils';

export interface AddCountryFormState {
  name: string;
  code: string;
  latitude: string;
  longitude: string;
  flag: string;
  photos: string[];
}

interface AddCountryModalProps {
  open: boolean;
  form: AddCountryFormState;
  errors: Record<string, string>;
  targetStatus: string;
  isAdding: boolean;
  onClose: () => void;
  onFormChange: (next: AddCountryFormState) => void;
  onClearError: (field: string) => void;
  onPickFromMap: () => void;
  onSubmit: () => void;
}

const AddCountryModal = forwardRef<HTMLDivElement, AddCountryModalProps>(function AddCountryModal(
  {
    open,
    form,
    errors,
    targetStatus,
    isAdding,
    onClose,
    onFormChange,
    onClearError,
    onPickFromMap,
    onSubmit,
  },
  ref
) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-modal-title"
    >
      <div ref={ref} className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="add-modal-title" className="modal-title">
            Add new country
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="country-name">Country name *</label>
            <input
              id="country-name"
              type="text"
              value={form.name}
              onChange={(e) => {
                onFormChange({ ...form, name: e.target.value });
                onClearError('name');
              }}
              placeholder="Ex: France"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'country-name-error' : undefined}
            />
            {errors.name && (
              <p id="country-name-error" className="form-error" role="alert">
                {errors.name}
              </p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="country-code">Country code (ISO) *</label>
            <input
              id="country-code"
              type="text"
              value={form.code}
              onChange={(e) => {
                onFormChange({ ...form, code: e.target.value.toUpperCase() });
                onClearError('code');
              }}
              placeholder="Ex: FR"
              maxLength={2}
              aria-invalid={!!errors.code}
              aria-describedby={errors.code ? 'country-code-error' : undefined}
            />
            {errors.code && (
              <p id="country-code-error" className="form-error" role="alert">
                {errors.code}
              </p>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="country-latitude">Latitude *</label>
              <input
                id="country-latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => {
                  onFormChange({ ...form, latitude: e.target.value });
                  onClearError('latitude');
                }}
                placeholder="Ex: 46.2276"
                aria-invalid={!!errors.latitude}
                aria-describedby={errors.latitude ? 'country-latitude-error' : undefined}
              />
              {errors.latitude && (
                <p id="country-latitude-error" className="form-error" role="alert">
                  {errors.latitude}
                </p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="country-longitude">Longitude *</label>
              <input
                id="country-longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => {
                  onFormChange({ ...form, longitude: e.target.value });
                  onClearError('longitude');
                }}
                placeholder="Ex: 2.2137"
                aria-invalid={!!errors.longitude}
                aria-describedby={errors.longitude ? 'country-longitude-error' : undefined}
              />
              {errors.longitude && (
                <p id="country-longitude-error" className="form-error" role="alert">
                  {errors.longitude}
                </p>
              )}
            </div>
          </div>
          <div className="form-group form-group-pick-map">
            <button
              type="button"
              className="btn-pick-from-map"
              onClick={onPickFromMap}
              aria-label="Pick location from map"
            >
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
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Pick from map</span>
            </button>
            <p className="form-help">
              Click to close this form and select a point on the map; latitude and longitude will be filled automatically.
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="country-flag">Flag URL (optional)</label>
            <input
              id="country-flag"
              type="text"
              value={form.flag}
              onChange={(e) => onFormChange({ ...form, flag: e.target.value })}
              placeholder="Leave empty to use flagcdn.com automatically"
            />
          </div>
          <div className="form-group">
            <label>
              Status: <strong>{getStatusDisplayLabel(targetStatus)}</strong>
            </label>
            <p className="form-help">
              This country will be added to {getStatusDisplayLabel(targetStatus)}.
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-submit"
            onClick={onSubmit}
            disabled={isAdding}
            aria-label={isAdding ? 'Adding country…' : 'Add new country'}
            aria-busy={isAdding}
          >
            {isAdding ? (
              <>
                <span className="btn-spinner" aria-hidden />
                <span>Adding...</span>
              </>
            ) : (
              'Add country'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AddCountryModal;
