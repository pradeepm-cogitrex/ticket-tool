import { useEffect, useMemo, useState } from 'react';
import { Mail, MessageCircle, Send } from 'lucide-react';
import type { Contact } from '@/modules/masters/contact/contact.types';
import { Button } from '@/shared/components/button';
import { Segmented } from '@/shared/components/segmented';
import { TextArea } from '@/shared/components/form/text-area';
import { useToast } from '@/shared/context/toast-context';
import { errorMessage } from '@/shared/services/api.service';
import { timeAgo, formatDateTime } from '@/shared/utils/date.util';
import { ticketService } from '../ticket.service';
import type { NotificationChannel, TicketDetail, TicketNotification } from '../ticket.types';

type Template = 'assigned' | 'resolved' | 'custom';

/** Starting text for each moment; {name} becomes each contact's name when sent. */
function templateText(template: Template, t: TicketDetail): string {
  const head = `Hi {name},\n\nYour ticket ${t.ticketNo} "${t.subject}"`;
  if (template === 'assigned') {
    return `${head} has been assigned to ${t.assignedTo?.name ?? 'our support team'} and is being worked on. We will update you once it is resolved.\n\nThank you.`;
  }
  if (template === 'resolved') {
    const note = t.resolutionNote ? `\n\nResolution: ${t.resolutionNote}` : '';
    return `${head} has been resolved.${note}\n\nIf the issue continues, please reply to this message.\n\nThank you.`;
  }
  return '';
}

const STATUS_LABEL: Record<TicketNotification['status'], string> = {
  sent: 'Sent',
  failed: 'Failed',
  not_configured: 'Not sent — not set up',
};

interface NotifyUserProps {
  ticket: TicketDetail;
  /** active user contacts of the ticket's client product */
  contacts: Contact[];
  onSent: () => void;
}

/** Pick contacts and Email / WhatsApp, edit the message, Send. Below, every message sent so far. */
export function NotifyUser({ ticket, contacts, onSent }: NotifyUserProps) {
  const toast = useToast();
  const resolved = ticket.status.type === 'closed';
  const [template, setTemplate] = useState<Template>(resolved ? 'resolved' : 'assigned');
  const [message, setMessage] = useState(() => templateText(template, ticket));
  const [selected, setSelected] = useState<number[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>(['email', 'whatsapp']);
  const [sending, setSending] = useState(false);

  // the ticket's own contact is ticked by default
  useEffect(() => {
    setSelected(ticket.contactId && contacts.some((c) => c.id === ticket.contactId) ? [ticket.contactId] : []);
  }, [ticket.contactId, contacts]);

  // a status change (e.g. to Resolved) switches the starting text
  useEffect(() => {
    const next: Template = ticket.status.type === 'closed' ? 'resolved' : 'assigned';
    setTemplate(next);
    setMessage(templateText(next, ticket));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.statusId, ticket.assignedToId, ticket.resolutionNote]);

  const chooseTemplate = (next: Template) => {
    setTemplate(next);
    if (next !== 'custom') setMessage(templateText(next, ticket));
  };

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const chosen = contacts.filter((c) => selected.includes(c.id));
  const reachable = useMemo(
    () => chosen.some((c) => (channels.includes('email') && c.email) || (channels.includes('whatsapp') && c.phone)),
    [chosen, channels],
  );
  const notReady = channels.filter((ch) => !ticket.messaging[ch]);

  const send = async () => {
    setSending(true);
    try {
      const res = await ticketService.notify(ticket.id, { contactIds: selected, channels, message: message.trim() });
      const parts = [
        res.sent && `${res.sent} sent`,
        res.notConfigured && `${res.notConfigured} saved (not set up yet)`,
        res.failed && `${res.failed} failed`,
      ].filter(Boolean);
      (res.failed ? toast.error : toast.success)(parts.join(', ') + (res.skipped.length ? ` · skipped ${res.skipped.join(', ')}` : ''));
      onSent();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="notify">
      {contacts.length === 0 ? (
        <p className="muted notify__empty">
          No user contacts for {ticket.client?.name ?? 'this client'} · {ticket.product.name}. Add them in Masters › User Contacts.
        </p>
      ) : (
        <>
          <div className="notify__contacts" role="group" aria-label="Contacts to inform">
            {contacts.map((c) => (
              <label key={c.id} className="notify__contact">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => setSelected((s) => toggle(s, c.id))}
                />
                <span className="notify__contact-meta">
                  <strong>
                    {c.name}
                    {c.id === ticket.contactId && <em className="notify__tag">Ticket contact</em>}
                  </strong>
                  <span>{[c.email, c.phone].filter(Boolean).join(' · ')}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="notify__channels" role="group" aria-label="Send by">
            <button
              type="button"
              className={`notify__channel${channels.includes('email') ? ' is-on' : ''}`}
              aria-pressed={channels.includes('email')}
              onClick={() => setChannels((ch) => toggle(ch, 'email'))}
            >
              <Mail size={14} /> Email
            </button>
            <button
              type="button"
              className={`notify__channel${channels.includes('whatsapp') ? ' is-on' : ''}`}
              aria-pressed={channels.includes('whatsapp')}
              onClick={() => setChannels((ch) => toggle(ch, 'whatsapp'))}
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
          </div>

          <Segmented<Template>
            ariaLabel="Message"
            value={template}
            onChange={chooseTemplate}
            options={[
              { value: 'assigned', label: 'Assigned' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          <TextArea
            aria-label="Message"
            rows={7}
            value={message}
            maxLength={2000}
            placeholder="Write the message. {name} becomes the contact's name."
            onChange={(e) => {
              setMessage(e.target.value);
              setTemplate('custom');
            }}
          />

          {notReady.length > 0 && (
            <p className="field__hint">
              {notReady.map((ch) => (ch === 'email' ? 'Mail' : 'WhatsApp')).join(' and ')} not set up yet: the message is saved but not
              delivered.
            </p>
          )}

          <Button
            variant="primary"
            icon={<Send />}
            block
            loading={sending}
            disabled={!selected.length || !channels.length || !message.trim() || !reachable}
            onClick={send}
          >
            Submit
          </Button>
        </>
      )}

      {ticket.notifications.length > 0 && (
        <ul className="notify__log">
          {ticket.notifications.map((n) => (
            <li key={n.id} title={n.error ?? n.message}>
              {n.channel === 'email' ? <Mail size={13} /> : <MessageCircle size={13} />}
              <span className="notify__log-who">
                <strong>{n.recipientName}</strong>
                <span>{n.recipient}</span>
              </span>
              <span className={`notify__status notify__status--${n.status}`}>{STATUS_LABEL[n.status]}</span>
              <span className="notify__when" title={formatDateTime(n.createdAt)}>
                {timeAgo(n.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
