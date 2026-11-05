import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { useTheme } from '@/shared/context/theme-context';

const TITLES: [RegExp, string, string?][] = [
  [/^\/dashboard/, 'Dashboard'],
  [/^\/tickets\/new/, 'New ticket', 'Tickets'],
  [/^\/tickets\/.+/, 'Ticket', 'Tickets'],
  [/^\/tickets/, 'Tickets'],
  [/^\/masters\/clients/, 'Clients', 'Masters'],
  [/^\/masters\/products/, 'Products', 'Masters'],
  [/^\/masters\/client-products/, 'Client-Product Map', 'Masters'],
  [/^\/masters\/modules/, 'Modules', 'Masters'],
  [/^\/masters\/ticket-types/, 'Ticket types', 'Masters'],
  [/^\/masters\/priorities/, 'Priority & SLA', 'Masters'],
  [/^\/masters\/statuses/, 'Statuses', 'Masters'],
  [/^\/masters\/employees/, 'Employees', 'Masters'],
  [/^\/masters\/organization-employees/, 'By client product', 'Masters'],
];

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const match = TITLES.find(([re]) => re.test(pathname));
  const title = pathname.startsWith('/tickets/') && !pathname.endsWith('/new') ? decodeURIComponent(pathname.slice('/tickets/'.length)) : match?.[1];
  const parent = match?.[2];

  // Ctrl+K or "/" focuses the search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // a full ticket number opens the ticket directly
    if (/^TKT-[A-Z0-9_-]+(\/\d{2}\/\d+)?$/i.test(q)) navigate(`/tickets/${q.toUpperCase()}`);
    else navigate(`/tickets?tab=all&search=${encodeURIComponent(q)}`);
    setQuery('');
    searchRef.current?.blur();
  };

  return (
    <header className="topbar">
      <Button className="topbar__menu" variant="ghost" iconOnly icon={<Menu />} onClick={onMenu} aria-label="Open menu" />
      <div className="topbar__crumbs">
        {parent && (
          <>
            <span>{parent}</span>
            <ChevronRight />
          </>
        )}
        <strong>{title}</strong>
      </div>

      <form className="topbar__search" onSubmit={search} role="search">
        <div className="input-wrap">
          <Search />
          <input
            ref={searchRef}
            className="input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets or TKT-…"
            aria-label="Search tickets"
          />
        </div>
        <span className="kbd">Ctrl K</span>
      </form>

      <div className="topbar__actions">
        <Button
          variant="ghost"
          iconOnly
          icon={theme === 'dark' ? <Sun /> : <Moon />}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        />
        <Button variant="primary" icon={<Plus />} onClick={() => navigate('/tickets/new')}>
          <span className="topbar__new-label">New ticket</span>
        </Button>
      </div>
    </header>
  );
}
