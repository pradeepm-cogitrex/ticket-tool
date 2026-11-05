import { useCallback, useEffect, useState } from 'react';
import { FilePreview, isPreviewable } from '@/shared/components/file-preview';
import { useToast } from '@/shared/context/toast-context';
import { errorMessage, saveFile } from '@/shared/services/api.service';
import { ticketService } from '../ticket.service';
import type { TicketAttachment } from '../ticket.types';

/** Each attachment is fetched once per session and kept as an object URL. */
const urlCache = new Map<number, Promise<string>>();

export function attachmentUrl(attachment: TicketAttachment): Promise<string> {
  let url = urlCache.get(attachment.id);
  if (!url) {
    url = ticketService.attachmentBlob(attachment).then((b) => URL.createObjectURL(b));
    url.catch(() => urlCache.delete(attachment.id));
    urlCache.set(attachment.id, url);
  }
  return url;
}

export const isImageAttachment = (a: TicketAttachment) => a.mimeType.startsWith('image/');

/** Small image tile that loads the attachment and opens the preview on click. */
export function AttachmentThumb({ attachment, onOpen, size = 'md' }: { attachment: TicketAttachment; onOpen: () => void; size?: 'sm' | 'md' }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    attachmentUrl(attachment)
      .then((u) => alive && setSrc(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attachment]);

  return (
    <button type="button" className={`att-thumb att-thumb--${size}`} onClick={onOpen} title={`View ${attachment.fileName}`}>
      {src ? <img src={src} alt={attachment.fileName} /> : <span className={failed ? 'att-thumb__fail' : 'skeleton'} />}
    </button>
  );
}

/**
 * Preview popup for ticket attachments.
 * `open(attachment)` shows images and PDFs in the popup; other file types simply download.
 */
export function useAttachmentPreview() {
  const toast = useToast();
  const [current, setCurrent] = useState<TicketAttachment | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(
    (attachment: TicketAttachment) => {
      attachmentUrl(attachment)
        .then((url) => saveFile(url, attachment.fileName))
        .catch((e) => toast.error(errorMessage(e)));
    },
    [toast],
  );

  const open = useCallback(
    (attachment: TicketAttachment) => {
      if (!isPreviewable(attachment.mimeType)) {
        download(attachment);
        return;
      }
      setCurrent(attachment);
      setSrc(null);
      setError(null);
      attachmentUrl(attachment)
        .then(setSrc)
        .catch((e) => setError(errorMessage(e, 'Could not load the file')));
    },
    [download],
  );

  const close = useCallback(() => setCurrent(null), []);

  const modal = (
    <FilePreview
      open={!!current}
      name={current?.fileName ?? ''}
      mimeType={current?.mimeType ?? ''}
      src={src}
      error={error}
      onClose={close}
      onDownload={current ? () => download(current) : undefined}
    />
  );

  return { open, download, modal };
}
