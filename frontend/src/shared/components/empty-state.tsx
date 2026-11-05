import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon = <Inbox />, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__art">{icon}</div>
      <div className="empty__title">{title}</div>
      {text && <p className="empty__text">{text}</p>}
      {action}
    </div>
  );
}
