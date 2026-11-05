import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layout/app-layout';
import Login from '@/modules/auth/login';
import { ProtectedRoute } from './protected-route';

const DashboardView = lazy(() => import('@/modules/dashboard/dashboard-view'));
const TicketList = lazy(() => import('@/modules/tickets/ticket-list'));
const TicketForm = lazy(() => import('@/modules/tickets/ticket-form'));
const TicketDetail = lazy(() => import('@/modules/tickets/ticket-detail'));
const ClientView = lazy(() => import('@/modules/masters/client/client-view'));
const ProductView = lazy(() => import('@/modules/masters/product/product-view'));
const ClientProductView = lazy(() => import('@/modules/masters/client-product/client-product-view'));
const ContactView = lazy(() => import('@/modules/masters/contact/contact-view'));
const ModuleView = lazy(() => import('@/modules/masters/module/module-view'));
const TicketTypeView = lazy(() => import('@/modules/masters/ticket-type/ticket-type-view'));
const PriorityView = lazy(() => import('@/modules/masters/priority/priority-view'));
const StatusView = lazy(() => import('@/modules/masters/status/status-view'));
const EmployeeView = lazy(() => import('@/modules/masters/employee/employee-view'));
const OrganizationEmployeesView = lazy(() => import('@/modules/masters/employee/organization-employees-view'));

const PageLoader = () => (
  <div style={{ display: 'grid', gap: 14, paddingTop: 8 }}>
    <span className="skeleton" style={{ width: 140, height: 12 }} />
    <span className="skeleton" style={{ width: '40%', height: 28 }} />
    <span className="skeleton" style={{ width: '100%', height: 320, borderRadius: 18 }} />
  </div>
);

const page = (node: JSX.Element) => <Suspense fallback={<PageLoader />}>{node}</Suspense>;
const superAdmin = (node: JSX.Element) => <ProtectedRoute roles={['super_admin']}>{page(node)}</ProtectedRoute>;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={page(<DashboardView />)} />
        <Route path="tickets" element={page(<TicketList />)} />
        <Route path="tickets/new" element={page(<TicketForm />)} />
        {/* ticket numbers contain slashes (TKT-SAKKU-HRMS-11/26/00042), so the rest of the path is the number */}
        <Route path="tickets/*" element={page(<TicketDetail />)} />
        <Route path="masters">
          <Route index element={<Navigate to="/masters/clients" replace />} />
          <Route path="clients" element={superAdmin(<ClientView />)} />
          <Route path="products" element={superAdmin(<ProductView />)} />
          <Route path="client-products" element={superAdmin(<ClientProductView />)} />
          <Route path="contacts" element={superAdmin(<ContactView />)} />
          <Route path="modules" element={superAdmin(<ModuleView />)} />
          <Route path="categories" element={<Navigate to="/masters/modules" replace />} />
          <Route path="ticket-types" element={superAdmin(<TicketTypeView />)} />
          <Route path="priorities" element={superAdmin(<PriorityView />)} />
          <Route path="statuses" element={superAdmin(<StatusView />)} />
          <Route path="employees" element={superAdmin(<EmployeeView />)} />
          <Route path="organization-employees" element={superAdmin(<OrganizationEmployeesView />)} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
