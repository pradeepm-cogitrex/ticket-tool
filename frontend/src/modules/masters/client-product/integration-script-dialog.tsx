import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { useToast } from '@/shared/context/toast-context';
import type { ClientProduct } from './client-product.types';
import { pairLabel } from './client-product.types';

/** Where the backend serves helpx-bot.js: same host as the API, without /api. */
const scriptOrigin = (): string => {
  try {
    return new URL(import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').origin;
  } catch {
    return 'http://localhost:4000';
  }
};

/** One script per client product: the key tells the ticket tool which client and product a ticket belongs to. */
export const integrationScript = (mapping: ClientProduct): string =>
  `<script src="${scriptOrigin()}/static/helpx-bot/helpx-bot.js?appClientId=${mapping.clientKey ?? ''}&productName=${encodeURIComponent(mapping.product.name)}"></script>`;

const IDENTIFY_SNIPPET = `<script>
  // optional: after login, tell HelpX who the user is
  window.HelpXBot && window.HelpXBot.identify({ username: 'USERNAME', email: 'EMAIL' });
</script>`;

interface IntegrationScriptDialogProps {
  mapping: ClientProduct | null;
  onClose: () => void;
}

/** "Please embed this script in your index.html" with Copy. */
export function IntegrationScriptDialog({ mapping, onClose }: IntegrationScriptDialogProps) {
  const toast = useToast();
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!mapping) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mapping, onClose]);

  if (!mapping) return null;
  const script = integrationScript(mapping);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      box.current?.select();
      toast.error('Copy was blocked. The script is selected; press Ctrl+C.');
    }
  };

  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <div className="dialog script-dialog" role="dialog" aria-modal="true" aria-labelledby="script-title">
        <div className="script-dialog__head">
          <span className="script-dialog__badge">HelpX Bot Integration Script</span>
          <span className="code-badge">{mapping.client.code}</span>
          <span className="code-badge">{mapping.product.code}</span>
          <span className="muted">{pairLabel(mapping)}</span>
        </div>
        <p className="script-dialog__lead" id="script-title">
          <AlertCircle size={16} /> Please embed this script in your <code>index.html</code>
        </p>
        <textarea ref={box} className="textarea mono script-dialog__code" readOnly value={script} rows={4} onFocus={(e) => e.target.select()} />
        <details className="script-dialog__more">
          <summary>Pass the logged-in user (optional)</summary>
          <p>Without this, the widget asks the user for their username and email.</p>
          <pre className="mono">{IDENTIFY_SNIPPET}</pre>
          <Button size="sm" icon={<Copy />} onClick={() => copy(IDENTIFY_SNIPPET, 'Snippet')}>
            Copy snippet
          </Button>
        </details>
        <div className="dialog__actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Copy />} onClick={() => copy(script, 'Script')} disabled={!mapping.clientKey}>
            Copy
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
