import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ticketService } from '@/modules/tickets/ticket.service';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

/** Signed-in shell: sidebar, top bar, and the current page. */
export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [openCount, setOpenCount] = useState<number>();
  const { pathname } = useLocation();

  // refresh the open-ticket badge as the user moves around
  useEffect(() => {
    ticketService
      .counts()
      .then((c) => setOpenCount(c.open))
      .catch(() => undefined);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className={`shell${navOpen ? ' nav-open' : ''}`}>
      <Sidebar openCount={openCount} onNavigate={() => setNavOpen(false)} />
      <div className="backdrop-mobile" onClick={() => setNavOpen(false)} />
      <div className="main">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
