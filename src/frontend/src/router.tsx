import { Layout } from "@/components/Layout";
import AdminLocationsPage from "@/pages/AdminLocationsPage";
import AdminRecapPage from "@/pages/AdminRecapPage";
import AttendancePage from "@/pages/AttendancePage";
import HistoryPage from "@/pages/HistoryPage";
import ProfilePage from "@/pages/ProfilePage";
import { ROUTES } from "@/types";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.home,
  component: AttendancePage,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.history,
  component: HistoryPage,
});

const adminRecapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.adminRecap,
  component: AdminRecapPage,
});

const adminLocationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.adminLocations,
  component: AdminLocationsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.profile,
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  historyRoute,
  adminRecapRoute,
  adminLocationsRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
