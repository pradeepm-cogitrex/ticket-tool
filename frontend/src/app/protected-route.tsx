import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import type { UserRole } from '@/modules/auth/auth.types';
import { EmptyState } from '@/shared/components/empty-state';

interface ProtectedRouteProps {
  children: ReactNode;
  /** only these roles may open the page */
  roles?: UserRole[];
}

/** Sends signed-out users to /login, and blocks pages that need a role the user lacks. */
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: '40px auto' }}>
        <EmptyState icon={<ShieldAlert />} title="Super admins only" text="Ask a super admin if you need to change masters." />
      </div>
    );
  }

  return <>{children}</>;
}
