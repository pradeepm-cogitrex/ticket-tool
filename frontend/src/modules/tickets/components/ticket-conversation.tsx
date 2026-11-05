import { Download, Eye, FileText, Lock } from 'lucide-react';
import { Avatar } from '@/shared/components/avatar';
import { isPreviewable } from '@/shared/components/file-preview';
import { formatDateTime, timeAgo } from '@/shared/utils/date.util';
import { fileSize } from '@/shared/utils/format.util';
import type { TicketAttachment, TicketDetail } from '../ticket.types';
import { AttachmentThumb, isImageAttachment } from './attachment-preview';

interface TicketConversationProps {
  ticket: TicketDetail;
  /** opens images and PDFs in the preview popup */
  onOpen: (attachment: TicketAttachment) => void;
  onDownload: (attachment: TicketAttachment) => void;
}

interface AttachmentListProps {
  items: TicketAttachment[];
  onOpen: (a: TicketAttachment) => void;
  onDownload: (a: TicketAttachment) => void;
}

/** Images as clickable thumbnails; other files as chips (PDFs open in the preview too). */
function AttachmentList({ items, onOpen, onDownload }: AttachmentListProps) {
  if (!items.length) return null;
  const images = items.filter(isImageAttachment);
  const others = items.filter((a) => !isImageAttachment(a));
  return (
    <>
      {images.length > 0 && (
        <div className="msg__images">
          {images.map((a) => (
            <AttachmentThumb key={a.id} attachment={a} onOpen={() => onOpen(a)} />
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="msg__files">
          {others.map((a) => {
            const viewable = isPreviewable(a.mimeType);
            return (
              <span key={a.id} className="file-chip">
                <button
                  type="button"
                  className="file-chip__main"
                  onClick={() => (viewable ? onOpen(a) : onDownload(a))}
                  title={viewable ? `View ${a.fileName}` : `Download ${a.fileName}`}
                >
                  <FileText />
                  <span className="file-chip__name">{a.fileName}</span>
                  <span className="file-chip__size">{fileSize(a.size)}</span>
                  {viewable && <Eye className="file-chip__dl" />}
                </button>
                <button type="button" className="file-chip__download" onClick={() => onDownload(a)} aria-label={`Download ${a.fileName}`} title="Download">
                  <Download />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </>
  );
}

/** The original issue followed by every reply and internal note, oldest first. */
export function TicketConversation({ ticket, onOpen, onDownload }: TicketConversationProps) {
  const ticketFiles = ticket.attachments.filter((a) => !a.replyId);

  return (
    <ol className="thread">
      <li className="msg msg--customer">
        <Avatar name={ticket.username} size="lg" />
        <div className="msg__body">
          <div className="msg__head">
            <strong>{ticket.username}</strong>
            <span className="msg__tag">Raised the issue</span>
            <time title={formatDateTime(ticket.createdAt)}>{timeAgo(ticket.createdAt)}</time>
          </div>
          <div className="msg__bubble">
            <div className="msg__subject">{ticket.subject}</div>
            <p className="msg__text">{ticket.description}</p>
            <AttachmentList items={ticketFiles} onOpen={onOpen} onDownload={onDownload} />
          </div>
          <div className="msg__foot">
            {ticket.source === 'widget' ? (
              <>
                Raised from the {ticket.product.name} application via HelpX widget
                {ticket.sourceUrl && (
                  <>
                    {' · '}
                    <a href={ticket.sourceUrl} target="_blank" rel="noreferrer">
                      page
                    </a>
                  </>
                )}
              </>
            ) : (
              <>Logged by {ticket.createdBy?.name}</>
            )}
          </div>
        </div>
      </li>

      {ticket.replies.map((r) => (
        <li key={r.id} className={r.isInternal ? 'msg msg--note' : 'msg msg--staff'}>
          <Avatar name={r.author?.name} size="lg" />
          <div className="msg__body">
            <div className="msg__head">
              <strong>{r.author?.name}</strong>
              {r.isInternal ? (
                <span className="msg__tag msg__tag--note">
                  <Lock size={11} /> Internal note
                </span>
              ) : (
                <span className="msg__tag">Reply</span>
              )}
              <time title={formatDateTime(r.createdAt)}>{timeAgo(r.createdAt)}</time>
            </div>
            <div className="msg__bubble">
              <p className="msg__text">{r.body}</p>
              <AttachmentList items={ticket.attachments.filter((a) => a.replyId === r.id)} onOpen={onOpen} onDownload={onDownload} />
            </div>
          </div>
        </li>
      ))}

      {ticket.resolutionNote && ticket.status.type === 'closed' && (
        <li className="msg msg--resolution">
          <div className="msg__resolution">
            <strong>Resolution</strong>
            <p className="msg__text">{ticket.resolutionNote}</p>
            {ticket.resolvedAt && <span className="muted">Resolved {formatDateTime(ticket.resolvedAt)}</span>}
          </div>
        </li>
      )}
    </ol>
  );
}
