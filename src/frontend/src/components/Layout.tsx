import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useDisplayName } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/types";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck,
  Clock,
  History,
  LogOut,
  MapPin,
  Menu,
  UserRound,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Clock;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.home, label: "Absensi", icon: Clock },
  { to: ROUTES.history, label: "Riwayat", icon: History },
  {
    to: ROUTES.adminRecap,
    label: "Rekap Kehadiran",
    icon: CalendarCheck,
    adminOnly: true,
  },
  {
    to: ROUTES.adminLocations,
    label: "Lokasi Kerja",
    icon: MapPin,
    adminOnly: true,
  },
];

function useActivePath(): string {
  return useRouterState({ select: (state) => state.location.pathname });
}

function NavLinks({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = useActivePath();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.to === ROUTES.home
            ? pathname === ROUTES.home
            : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            data-ocid={`nav.${item.to === ROUTES.home ? "home" : item.to.replace(/\//g, ".").replace(/^\./, "")}.link`}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon
              className={cn("size-4 shrink-0", isActive && "text-primary")}
              aria-hidden="true"
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link
      to={ROUTES.home}
      className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-ocid="nav.brand.link"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-card">
        <Clock className="size-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          AbsenKu
        </span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
          Presensi Tenang
        </span>
      </span>
    </Link>
  );
}

function UserMenu() {
  const { principal, isAdmin, logout } = useAuth();
  const { name } = useDisplayName();
  const displayName = name ?? "Karyawan";
  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Link
        to={ROUTES.profile}
        data-ocid="nav.profile.link"
        className="flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-3 transition-smooth hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary font-display text-xs font-bold text-secondary-foreground">
          {initials || <UserRound className="size-4" aria-hidden="true" />}
        </span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="max-w-[9rem] truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            {isAdmin ? "Admin" : "Karyawan"}
          </span>
        </span>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={logout}
        aria-label="Keluar"
        title={
          principal ? `Keluar (${principal.toString().slice(0, 8)}…)` : "Keluar"
        }
        data-ocid="nav.logout_button"
        className="rounded-full text-muted-foreground hover:text-destructive"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * App shell: sticky header, desktop sidebar navigation, mobile sheet menu,
 * and the attribution footer. Admin-only links render only for admins.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card shadow-subtle">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-xl md:hidden"
                  aria-label="Buka menu navigasi"
                  data-ocid="nav.menu_button"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-0">
                <SheetHeader className="border-b border-sidebar-border">
                  <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
                  <Brand />
                </SheetHeader>
                <div className="p-3">
                  <NavLinks
                    isAdmin={isAdmin}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Brand />
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-6 md:px-8 md:py-8">
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-24 rounded-2xl border border-sidebar-border bg-sidebar p-3 shadow-card">
            <NavLinks isAdmin={isAdmin} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row md:px-8">
          <span>AbsenKu — presensi kehadiran dengan GPS dan selfie.</span>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="transition-smooth hover:text-foreground"
          >
            © {new Date().getFullYear()}. Built with love using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
