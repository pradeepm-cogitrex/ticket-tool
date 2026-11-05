import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  Contact,
  Flag,
  LayoutDashboard,
  Layers,
  Link2,
  LogOut,
  Package,
  Shapes,
  Ticket,
  TicketPlus,
  Users,
  Workflow,
} from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { ROLE_LABEL } from '@/modules/auth/auth.types';
import { Avatar } from '@/shared/components/avatar';
import { Button } from '@/shared/components/button';

const MASTERS = [
  { to: '/masters/clients', label: 'Clients', icon: Building2 },
  { to: '/masters/products', label: 'Products', icon: Package },
  { to: '/masters/client-products', label: 'Client-Product Map', icon: Link2 },
  { to: '/masters/modules', label: 'Modules', icon: Layers },
  { to: '/masters/ticket-types', label: 'Ticket types', icon: Shapes },
  { to: '/masters/priorities', label: 'Priority & SLA', icon: Flag },
  { to: '/masters/statuses', label: 'Statuses', icon: Workflow },
  { to: '/masters/employees', label: 'Employees', icon: Users },
  { to: '/masters/contacts', label: 'User Contacts', icon: Contact },
];

interface SidebarProps {
  openCount?: number;
  onNavigate: () => void;
}

export function Sidebar({ openCount, onNavigate }: SidebarProps) {
  const { user, isSuperAdmin, logout } = useAuth();
  const location = useLocation();
  const inMasters = location.pathname.startsWith('/masters');
  const [mastersOpen, setMastersOpen] = useState(inMasters);

  useEffect(() => {
    if (inMasters) setMastersOpen(true);
  }, [inMasters]);

  return (
    <aside className="sidebar">
      <NavLink to="/dashboard" className="brand" onClick={onNavigate}>
        <span className="brand__mark">
          <Ticket />
        </span>
        <span className="brand__name">
          Ticket<em>Desk</em>
        </span>
      </NavLink>

      <nav className="nav" aria-label="Main">
        <NavLink to="/dashboard" className="nav__link" onClick={onNavigate}>
          <LayoutDashboard /> Dashboard
        </NavLink>
        <NavLink to="/tickets" end className="nav__link" onClick={onNavigate}>
          <Ticket /> Tickets
          {openCount !== undefined && openCount > 0 && <span className="nav__badge">{openCount}</span>}
        </NavLink>
        <NavLink to="/tickets/new" className="nav__link" onClick={onNavigate}>
          <TicketPlus /> New ticket
        </NavLink>

        {isSuperAdmin && (
          <>
            <button
              type="button"
              className={`nav__link nav__group-toggle${inMasters ? ' active' : ''}`}
              aria-expanded={mastersOpen}
              onClick={() => setMastersOpen((o) => !o)}
            >
              <Boxes /> Masters
              <ChevronDown className="chev" />
            </button>
            {mastersOpen && (
              <div className="nav__sub">
                {MASTERS.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className="nav__link" onClick={onNavigate}>
                    <Icon /> {label}
                  </NavLink>
                ))}
              </div>
            )}
          </>
        )}

        <div className="nav__label">Coming next</div>
        <span className="nav__link" aria-disabled="true">
          <BarChart3 /> Reports <span className="nav__badge nav__badge--soon">SOON</span>
        </span>
      </nav>

      <div className="sidebar__foot">
        <div className="user-card">
          <Avatar name={user?.name} />
          <div className="user-card__meta">
            <div className="user-card__name">{user?.name}</div>
            <div className="user-card__role">{user ? ROLE_LABEL[user.role] : ''}</div>
          </div>
          <Button variant="ghost" size="sm" iconOnly icon={<LogOut />} onClick={logout} aria-label="Sign out" title="Sign out" />
        </div>
      </div>
    </aside>
  );
}
