import { RefObject, useEffect } from 'react';

/** Calls handler when the user clicks outside ref, or presses Escape. */
export function useClickOutside(ref: RefObject<HTMLElement>, handler: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, handler, enabled]);
}
