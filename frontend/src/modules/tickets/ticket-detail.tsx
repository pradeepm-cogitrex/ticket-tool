import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Lock,
  FileText,
  SearchX,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { contactService } from '@/modules/masters/contact/contact.service';
import type { Contact } from '@/modules/masters/contact/contact.types';
import { useLookups } from '@/modules/masters/use-lookups';
import { Avatar } from '@/shared/components/avatar';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { EmptyState } from '@/shared/components/empty-state';
import { TabItem, Tabs } from '@/shared/components/tabs';
import { useToast } from '@/shared/context/toast-context';
import { errorMessage } from '@/shared/services/api.service';
import { formatDateTime, timeAgo } from '@/shared/utils/date.util';
import { fileSize } from '@/shared/utils/format.util';
import { DueLabel } from './components/due-label';
import { FileDrop } from './components/file-drop';
import { ReplyComposer } from './components/reply-composer';
import { SlaMeter } from './components/sla-meter';
import { TicketConversation } from './components/ticket-conversation';
import { AttachmentThumb, isImageAttachment, useAttachmentPreview } from './components/attachment-preview';
import { isPreviewable } from '@/shared/components/file-preview';
import { TicketHistory } from './components/ticket-history';
import { NotifyUser } from './components/notify-user';
import { TicketProperties } from './components/ticket-properties';
import { ticketService } from './ticket.service';
import type { TicketAttachment, TicketDetail as TicketDetailModel, UpdateTicketPayload } from './ticket.types';
import { ticketNeighbours } from './ticket.util';
import './tickets.css';

type DetailTab = 'conversation' | 'history' | 'files';

export default function TicketDetail() {
  // ticket numbers contain slashes, so the route is tickets/* and the number is the rest of the path
  const { '*': ticketNo = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const { lookups } = useLookups();

  const [ticket, setTicket] = useState<TicketDetailModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<DetailTab>('conversation');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        setTicket(await ticketService.get(ticketNo));
        setError(null);
      } catch (e) {
        const status = (e as { status?: number }).status;
        setError({ message: errorMessage(e), notFound: status === 404 });
      } finally {
        setLoading(false);
      }
    },
    [ticketNo],
  );

  useEffect(() => {
    setTab('conversation');
    load();
  }, [load]);

  // user contacts of the ticket's client product, for linking and informing
  const clientId = ticket?.clientId;
  const productId = ticket?.productId;
  useEffect(() => {
    if (!clientId || !productId) {
      setContacts([]);
      return;
    }
    let live = true;
    contactService
      .list({ clientId, productId, active: 'true' })
      .then((rows) => live && setContacts(rows))
      .catch(() => live && setContacts([]));
    return () => {
      live = false;
    };
  }, [clientId, productId]);

  const { prev, next } = useMemo(() => ticketNeighbours(ticketNo), [ticketNo]);

  const save = async (changes: UpdateTicketPayload, message = 'Ticket updated') => {
    if (!ticket) return;
    setSaving(true);
    try {
      setTicket(await ticketService.update(ticket.id, changes));
      toast.success(message);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (body: string, files: File[]) => {
    if (!ticket) return false;
    try {
      const reply = await ticketService.addReply(ticket.id, body);
      if (files.length) await ticketService.uploadAttachments(ticket.id, files, reply.id);
      toast.success('Reply sent');
      await load(true);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  // images and PDFs open in a preview popup; Download saves the file
  const preview = useAttachmentPreview();

  const uploadFiles = async () => {
    if (!ticket || !newFiles.length) return;
    setUploading(true);
    try {
      await ticketService.uploadAttachments(ticket.id, newFiles);
      toast.success(`${newFiles.length} file${newFiles.length === 1 ? '' : 's'} attached`);
      setNewFiles([]);
      await load(true);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const copyNo = () => {
    if (!ticket) return;
    navigator.clipboard?.writeText(ticket.ticketNo).then(
      () => toast.success('Ticket number copied'),
      () => undefined,
    );
  };

  if (loading && !ticket) {
    return (
      <div className="detail-skeleton">
        <span className="skeleton" style={{ width: 120, height: 14 }} />
        <span className="skeleton" style={{ width: '55%', height: 28 }} />
        <span className="skeleton" style={{ width: '35%', height: 14 }} />
        <span className="skeleton" style={{ width: '100%', height: 260, borderRadius: 18 }} />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}>
        <EmptyState
          icon={<SearchX />}
          title={error?.notFound ? `Ticket ${ticketNo} not found` : 'Could not load the ticket'}
          text={error?.notFound ? 'It may have been deleted, or the number is mistyped.' : error?.message}
          action={
            <Button icon={<ArrowLeft />} onClick={() => navigate('/tickets')}>
              Back to tickets
            </Button>
          }
        />
      </div>
    );
  }

  // a status such as Closed locks the ticket: no replies, files or changes
  const locked = ticket.status.locksTicket;
  const lockedNotice = (
    <div className="locked-notice">
      <Lock size={16} />
      <div>
        <strong>This ticket is {ticket.status.name}.</strong>
        <span>Replies and files are turned off.</span>
      </div>
    </div>
  );

  const tabs: TabItem<DetailTab>[] = [
    { value: 'conversation', label: 'Conversation', count: ticket.replies.length + 1 },
    { value: 'history', label: 'History', count: ticket.history.length },
    { value: 'files', label: 'Files', count: ticket.attachments.length },
  ];

  return (
    <div className="page-enter">
      <div className="detail-top">
        <Link to="/tickets" className="back-link">
          <ArrowLeft size={16} /> Tickets
        </Link>
        <div className="detail-top__nav">
          <Button size="sm" variant="ghost" icon={<ChevronLeft />} disabled={!prev} onClick={() => prev && navigate(`/tickets/${prev}`)}>
            Previous
          </Button>
          <Button size="sm" variant="ghost" disabled={!next} onClick={() => next && navigate(`/tickets/${next}`)}>
            Next <ChevronRight />
          </Button>
        </div>
      </div>

      <header className="detail-head">
        <div className="detail-head__main">
          <div className="detail-head__row">
            <button type="button" className="ticket-no ticket-no--lg" onClick={copyNo} title="Copy ticket number">
              {ticket.ticketNo}
              <Copy size={13} />
            </button>
            <Chip color={ticket.status.color} square>
              {ticket.status.name}
            </Chip>
            <Chip color={ticket.priority.color}>{ticket.priority.name}</Chip>
            {ticket.ticketType && <Chip color={ticket.ticketType.color} square>{ticket.ticketType.name}</Chip>}
            {ticket.source === 'widget' && <span className="src-badge">HelpX widget</span>}
            <DueLabel ticket={ticket} />
          </div>
          <h1 className="detail-head__title">{ticket.subject}</h1>
          <div className="detail-head__meta">
            <Avatar name={ticket.username} size="sm" showName />
            <span className="dot" />
            {ticket.client && <span className="code-badge">{ticket.client.code}</span>}
            <span className="code-badge">{ticket.product.code}</span>
            {ticket.module && <span>{ticket.module.name}</span>}
            <span className="dot" />
            <span title={formatDateTime(ticket.createdAt)}>Opened {timeAgo(ticket.createdAt)}</span>
          </div>
        </div>
        <div className="detail-head__actions">
        </div>
      </header>

      <div className="detail-layout">
        <section className="card detail-main">
          <div className="detail-main__tabs">
            <Tabs<DetailTab> ariaLabel="Ticket sections" value={tab} items={tabs} onChange={setTab} />
          </div>

          {tab === 'conversation' && (
            <div className="detail-main__body">
              <TicketConversation ticket={ticket} onOpen={preview.open} onDownload={preview.download} />
              {locked ? lockedNotice : <ReplyComposer onSend={sendReply} onReject={toast.error} />}
            </div>
          )}

          {tab === 'history' && <TicketHistory ticket={ticket} />}

          {tab === 'files' && (
            <div className="detail-main__body">
              {ticket.attachments.length > 0 ? (
                <ul className="files-table">
                  {ticket.attachments.map((a) => (
                    <li key={a.id}>
                      {isImageAttachment(a) ? (
                        <AttachmentThumb attachment={a} size="sm" onOpen={() => preview.open(a)} />
                      ) : (
                        <span className="files-table__icon">
                          <FileText />
                        </span>
                      )}
                      <div className="files-table__meta">
                        <strong>{a.fileName}</strong>
                        <span>
                          {fileSize(a.size)} · {a.uploadedBy?.name ?? 'HelpX widget'} · {timeAgo(a.createdAt)}
                        </span>
                      </div>
                      {isPreviewable(a.mimeType) && (
                        <Button size="sm" icon={<Eye />} onClick={() => preview.open(a)}>
                          View
                        </Button>
                      )}
                      <Button size="sm" icon={<Download />} onClick={() => preview.download(a)}>
                        Download
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted" style={{ marginBottom: 16 }}>
                  No files attached yet.
                </p>
              )}
              {locked ? (
                <div style={{ marginTop: 14 }}>{lockedNotice}</div>
              ) : (
              <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                <FileDrop files={newFiles} onChange={setNewFiles} onReject={toast.error} />
                {newFiles.length > 0 && (
                  <div>
                    <Button variant="primary" icon={<Upload />} onClick={uploadFiles} loading={uploading}>
                      Upload {newFiles.length} file{newFiles.length === 1 ? '' : 's'}
                    </Button>
                  </div>
                )}
              </div>
              )}
            </div>
          )}
        </section>

        <aside className="detail-side">
          <section className="card">
            <div className="card__head">
              <div className="card__title">SLA</div>
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                {ticket.priority.name} · {ticket.slaResolveHrs ?? ticket.priority.resolveHrs}h
              </span>
            </div>
            <div className="card__body">
              <SlaMeter ticket={ticket} />
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div className="card__title">Properties</div>
            </div>
            <div className="card__body">
              <TicketProperties ticket={ticket} lookups={lookups} saving={saving} isAdmin={isAdmin} user={user} contacts={contacts} onSave={(c) => save(c)} />
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div className="card__title">Inform user</div>
            </div>
            <div className="card__body">
              <NotifyUser ticket={ticket} contacts={contacts} onSent={() => load(true)} />
            </div>
          </section>

          <section className="card">
            <div className="card__body">
              <dl className="kv">
                <dt>Created by</dt>
                <dd>{ticket.createdBy?.name ?? `${ticket.username} (HelpX widget)`}</dd>
                <dt>Created on</dt>
                <dd>{formatDateTime(ticket.createdAt)}</dd>
                <dt>Last updated</dt>
                <dd>{formatDateTime(ticket.updatedAt)}</dd>
              </dl>
            </div>
          </section>
        </aside>
      </div>

      {preview.modal}
    </div>
  );
}
