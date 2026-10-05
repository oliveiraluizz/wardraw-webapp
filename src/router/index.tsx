import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageLoader } from "@/components/shared/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useMe } from "@/infra/hooks/queries";

const HomePage = lazy(() => import("@/pages/HomePage"));
const EventsPage = lazy(() => import("@/pages/EventsPage"));
const EventPage = lazy(() => import("@/pages/EventPage"));
const PlansPage = lazy(() => import("@/pages/PlansPage"));
const SparringPage = lazy(() => import("@/pages/SparringPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ComparePage = lazy(() => import("@/pages/ComparePage"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const OrganizerPage = lazy(() => import("@/pages/organizer/OrganizerPage"));
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"));
const StaticPage = lazy(() => import("@/pages/StaticPage"));

const page = (el: ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!session)
    return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <PageLoader />;
  if (!me?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: "/", element: page(<HomePage />) },
      { path: "/eventos", element: page(<EventsPage />) },
      { path: "/eventos/:slug", element: page(<EventPage />) },
      { path: "/planos", element: page(<PlansPage />) },
      { path: "/sparring", element: page(<SparringPage />) },
      { path: "/servicos", element: page(<ServicesPage />) },
      { path: "/p/:slug", element: page(<ProfilePage />) },
      {
        path: "/comparar",
        element: page(
          <RequireAuth>
            <ComparePage />
          </RequireAuth>,
        ),
      },
      { path: "/entrar", element: page(<LoginPage />) },
      {
        path: "/conta/*",
        element: page(
          <RequireAuth>
            <AccountPage />
          </RequireAuth>,
        ),
      },
      {
        path: "/organizador/*",
        element: page(
          <RequireAuth>
            <OrganizerPage />
          </RequireAuth>,
        ),
      },
      {
        path: "/admin/*",
        element: page(
          <RequireAuth>
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          </RequireAuth>,
        ),
      },
      { path: "/:slug", element: page(<StaticPage />) },
    ],
  },
]);
