import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileWarning, X } from 'lucide-react';
import { Button } from './button';

export const isPreviewable = (mimeType: string): boolean => mimeType.startsWith('image/') || mimeType === 'application/pdf';

interface FilePreviewProps {
  open: boolean;
  name: string;
  mimeType: string;
  /** object URL of the file; null while it is loading */
  src: string | null;
  error?: string | null;
  onClose: () => void;
  onDownload?: () => void;
}

/** Popup that shows an image, or a PDF in an iframe, with Download and Close. Esc or a click outside closes it. */
export function FilePreview({ open, name, mimeType, src, error, onClose, onDownload }: FilePreviewProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const isPdf = mimeType === 'application/pdf';

  return createPortal(
    <>
      <div className="overlay overlay--dark" onClick={onClose} />
      <div className={`preview-modal${isPdf ? ' preview-modal--pdf' : ''}`} role="dialog" aria-modal="true" aria-label={name}>
        <header className="preview-modal__head">
          <strong title={name}>{name}</strong>
          <div className="preview-modal__actions">
            {onDownload && (
              <Button size="sm" icon={<Download />} onClick={onDownload}>
                Download
              </Button>
            )}
            <Button size="sm" variant="ghost" iconOnly icon={<X />} onClick={onClose} aria-label="Close preview" />
          </div>
        </header>
        <div className="preview-modal__body" onClick={(e) => e.target === e.currentTarget && onClose()}>
          {error ? (
            <div className="preview-modal__msg">
              <FileWarning /> {error}
            </div>
          ) : !src ? (
            <div className="preview-modal__msg">
              <span className="spinner" /> Loading…
            </div>
          ) : isPdf ? (
            <iframe className="preview-modal__frame" src={src} title={name} />
          ) : (
            <img className="preview-modal__img" src={src} alt={name} />
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
