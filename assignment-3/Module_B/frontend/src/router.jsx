// src/router.jsx
// React Router v6 createBrowserRouter with lazy-loaded pages
// Protected routes redirect to /login
// Admin routes redirect to /unauthorized

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';

// -- Loading fallback for lazy pages ----------------------------------
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090d12]">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full bg-cyan-400/10 blur-xl" />
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-300/80 border-t-transparent" />
      </div>
    </div>
  );
}

// -- Lazy-load all page components -------------------------------------
const LoginPage            = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage   = lazy(() => import('@/pages/ForgotPasswordPage'));
const ChangePasswordPage   = lazy(() => import('@/pages/ChangePasswordPage'));
const UnauthorizedPage     = lazy(() => import('@/pages/UnauthorizedPage'));
const NotFoundPage         = lazy(() => import('@/pages/NotFoundPage'));
const AppLayout            = lazy(() => import('@/layouts/AppLayout'));
const DashboardPage      = lazy(() => import('@/pages/DashboardPage'));
const MembersPage        = lazy(() => import('@/pages/MembersPage'));
const MemberDetailPage   = lazy(() => import('@/pages/MemberDetailPage'));
const MemberPortfolioPage = lazy(() => import('@/pages/MemberPortfolioPage'));
const VehiclesPage       = lazy(() => import('@/pages/VehiclesPage'));
const VehicleDetailPage  = lazy(() => import('@/pages/VehicleDetailPage'));
const GatesPage          = lazy(() => import('@/pages/GatesPage'));
const GateDetailPage     = lazy(() => import('@/pages/GateDetailPage'));
const PersonVisitsPage   = lazy(() => import('@/pages/PersonVisitsPage'));
const VehicleVisitsPage  = lazy(() => import('@/pages/VehicleVisitsPage'));
const ActiveVisitsPage   = lazy(() => import('@/pages/ActiveVisitsPage'));
const UsersPage          = lazy(() => import('@/pages/admin/UsersPage'));
const AuditPage          = lazy(() => import('@/pages/admin/AuditPage'));
const ProfilePage        = lazy(() => import('@/pages/ProfilePage'));

// -- Route guards ------------------------------------------------------
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasRole('Admin', 'SuperAdmin')) return <Navigate to="/unauthorized" replace />;
  return children;
}

// -- Router definition -------------------------------------------------
const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ForgotPasswordPage />
      </Suspense>
    ),
  },
  {
    path: '/change-password',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedRoute>
          <ChangePasswordPage />
        </ProtectedRoute>
      </Suspense>
    ),
  },
  {
    path: '/unauthorized',
    element: (
      <Suspense fallback={<PageLoader />}>
        <UnauthorizedPage />
      </Suspense>
    ),
  },

  // Protected routes — all nested under AppLayout
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>,
      },
      {
        path: 'members',
        element: <Suspense fallback={<PageLoader />}><MembersPage /></Suspense>,
      },
      {
        path: 'members/:id',
        element: <Suspense fallback={<PageLoader />}><MemberDetailPage /></Suspense>,
      },
      {
        path: 'portfolio/:id',
        element: <Suspense fallback={<PageLoader />}><MemberPortfolioPage /></Suspense>,
      },
      {
        path: 'vehicles',
        element: <Suspense fallback={<PageLoader />}><VehiclesPage /></Suspense>,
      },
      {
        path: 'vehicles/:id',
        element: <Suspense fallback={<PageLoader />}><VehicleDetailPage /></Suspense>,
      },
      {
        path: 'gates',
        element: <Suspense fallback={<PageLoader />}><GatesPage /></Suspense>,
      },
      {
        path: 'gates/:id',
        element: <Suspense fallback={<PageLoader />}><GateDetailPage /></Suspense>,
      },
      {
        path: 'visits/persons',
        element: <Suspense fallback={<PageLoader />}><PersonVisitsPage /></Suspense>,
      },
      {
        path: 'visits/vehicles',
        element: <Suspense fallback={<PageLoader />}><VehicleVisitsPage /></Suspense>,
      },
      {
        path: 'visits/active',
        element: <Suspense fallback={<PageLoader />}><ActiveVisitsPage /></Suspense>,
      },
      {
        path: 'profile',
        element: <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>,
      },
      // Admin-only routes
      {
        path: 'admin/users',
        element: (
          <AdminRoute>
            <Suspense fallback={<PageLoader />}><UsersPage /></Suspense>
          </AdminRoute>
        ),
      },
      {
        path: 'admin/audit',
        element: (
          <AdminRoute>
            <Suspense fallback={<PageLoader />}><AuditPage /></Suspense>
          </AdminRoute>
        ),
      },
    ],
  },

  // Catch-all → 404 page
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

export default router;
