import { PointerEvent as ReactPointerEvent, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { storageService } from '../services/storage.service';
import { Button } from './button';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const WIDTH_KEY = 'td.drawerWidth';
const DEFAULT_WIDTH = 760;
const MIN_WIDTH = 420;

const clampWidth = (w: number) => Math.round(Math.min(Math.max(w, MIN_WIDTH), window.innerWidth * 0.96));
const savedWidth = () => {
  const w = Number(storageService.get(WIDTH_KEY));
  return clampWidth(Number.isFinite(w) && w > 0 ? w : DEFAULT_WIDTH);
};

/** Right-side panel used for every Add / Edit form. Drag its left edge to resize; the width is remembered. */
export function Drawer({ open, onClose, eyebrow, title, children, footer }: DrawerProps) {
  const [width, setWidth] = useState(savedWidth);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWidth(savedWidth());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
    let latest = width;
    const move = (ev: PointerEvent) => {
      latest = clampWidth(window.innerWidth - ev.clientX);
      setWidth(latest);
    };
    const up = () => {
      setDragging(false);
      storageService.set(WIDTH_KEY, String(latest));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const resetWidth = () => {
    setWidth(clampWidth(DEFAULT_WIDTH));
    storageService.set(WIDTH_KEY, String(DEFAULT_WIDTH));
  };

  if (!open) return null;

  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <aside
        className={`drawer${dragging ? ' is-resizing' : ''}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div
          className="drawer__resize"
          onPointerDown={startResize}
          onDoubleClick={resetWidth}
          role="separator"
          aria-orientation="vertical"
          aria-label="Drag to resize, double-click to reset"
          title="Drag to resize · double-click to reset"
        />
        <div className="drawer__head">
          <div>
            {eyebrow && <div className="drawer__eyebrow">{eyebrow}</div>}
            <h2 className="drawer__title" id="drawer-title">
              {title}
            </h2>
          </div>
          <Button variant="ghost" size="sm" iconOnly icon={<X />} onClick={onClose} aria-label="Close" />
        </div>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__foot">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}
