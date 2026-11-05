import { KeyboardEvent, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { FileDrop } from './file-drop';

interface ReplyComposerProps {
  onSend: (body: string, files: File[]) => Promise<boolean>;
  onReject: (message: string) => void;
}

/** Reply box at the bottom of the conversation. Ctrl+Enter sends. */
export function ReplyComposer({ onSend, onReject }: ReplyComposerProps) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    const ok = await onSend(body.trim(), files);
    setSending(false);
    if (ok) {
      setBody('');
      setFiles([]);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="composer">
      <div className="composer__title">
        <MessageSquare /> Reply
      </div>
      <textarea
        id="reply-body"
        placeholder="Enter Reply"
        className="composer__input"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKey}
        rows={4}
        aria-label="Reply"
      />
      <div className="composer__bar">
        <FileDrop files={files} onChange={setFiles} onReject={onReject} compact />
        <span className="composer__hint">
          <span className="kbd">Ctrl</span> + <span className="kbd">Enter</span> to send
        </span>
        <Button variant="primary" size="sm" icon={<Send />} onClick={send} loading={sending} disabled={!body.trim()}>
          Send reply
        </Button>
      </div>
    </div>
  );
}
