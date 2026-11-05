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

/** After login the application stores the user; the widget reads it when a ticket is raised. */
const loginSnippet = (mapping: ClientProduct): string => `sessionStorage.setItem('ticketDeskUser', JSON.stringify({
  username: "",            // logged-in user's login name (required)
  email: "",               // logged-in user's email
  clientName: ${JSON.stringify(mapping.client.name)},
  product: ${JSON.stringify(mapping.product.name)}
}));`;

const LOGOUT_SNIPPET = `sessionStorage.removeItem('ticketDeskUser');`;

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
  const login = loginSnippet(mapping);

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
        <div className="script-step">
          <p className="script-dialog__lead" id="script-title">
            <span className="script-step__no">1</span> Embed this script in your <code>index.html</code>
          </p>
          <textarea ref={box} className="textarea mono script-dialog__code" readOnly value={script} rows={4} onFocus={(e) => e.target.select()} />
          <Button size="sm" icon={<Copy />} onClick={() => copy(script, 'Script')} disabled={!mapping.clientKey}>
            Copy script
          </Button>
        </div>
        <div className="script-step">
          <p className="script-dialog__lead">
            <span className="script-step__no">2</span> After login, pass the logged-in user (also after a page reload)
          </p>
          <pre className="mono script-step__code">{login}</pre>
          <Button size="sm" icon={<Copy />} onClick={() => copy(login, 'Login code')}>
            Copy login code
          </Button>
        </div>
        <div className="script-step">
          <p className="script-dialog__lead">
            <span className="script-step__no">3</span> On logout, remove the user
          </p>
          <pre className="mono script-step__code">{LOGOUT_SNIPPET}</pre>
          <Button size="sm" icon={<Copy />} onClick={() => copy(LOGOUT_SNIPPET, 'Logout code')}>
            Copy logout code
          </Button>
        </div>
        <div className="dialog__actions">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
