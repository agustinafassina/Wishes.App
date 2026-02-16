"use client";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  onCopyLink: () => void;
  onDownloadImage: () => void;
  shareLinkCopied: boolean;
  isSharingImage: boolean;
}

export default function ShareModal({
  open,
  onClose,
  onCopyLink,
  onDownloadImage,
  shareLinkCopied,
  isSharingImage,
}: ShareModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="share-modal-backdrop" onClick={onClose} aria-hidden />
      <div className="share-modal" role="dialog" aria-label="Share options">
        <button
          type="button"
          className="share-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 className="share-modal-title">Share your progress</h2>
        <div className="share-modal-actions">
          <button type="button" className="share-action-btn" onClick={onCopyLink}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{shareLinkCopied ? 'Copied!' : 'Copy link'}</span>
          </button>
          <button
            type="button"
            className="share-action-btn"
            onClick={onDownloadImage}
            disabled={isSharingImage}
          >
            {isSharingImage ? (
              <span className="share-spinner" aria-hidden />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            <span>{isSharingImage ? 'Creating...' : 'Download image'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
