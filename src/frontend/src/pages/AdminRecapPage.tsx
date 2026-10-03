import { AttendanceDetailDialog } from "@/components/admin/AttendanceDetailDialog";
import {
  type RecapCounts,
  RecapSummary,
} from "@/components/admin/RecapSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useAttendanceRecap, useWorkLocations } from "@/hooks/useQueries";
import type { AttendanceView, DayKey, UserId } from "@/types";
import { formatClock, formatDayKey, todayKey } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import {
  CalendarDays,
  ChevronRight,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

const ALL = "__all__";

function shortPrincipal(principal: string): string {
  return principal.length > 14
    ? `${principal.slice(0, 8)}…${principal.slice(-4)}`
    : principal;
}

function StatusBadge({ record }: { record: AttendanceView }) {
  if (record.clockOut !== undefined) {
    return (
      <Badge variant="secondary" className="rounded-full">
        Sudah Keluar
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-success text-success-foreground">
      Hadir
    </Badge>
  );
}

function AccessDenied() {
  return (
    <section
      data-ocid="admin_recap.access_denied_state"
      className="animate-fade-in rounded-2xl border border-border bg-card p-8 text-center shadow-card"
    >
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
        Akses ditolak
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Halaman rekap kehadiran hanya dapat diakses oleh admin. Hubungi admin
        jika Anda memerlukan akses ke data kehadiran seluruh karyawan.
      </p>
    </section>
  );
}

function LoadingState() {
  const rows = Array.from({ length: 5 }, (_, i) => `recap-skeleton-${i}`);
  return (
    <div data-ocid="admin_recap.loading_state" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rows.slice(0, 4).map((id) => (
          <Skeleton key={id} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-subtle">
        <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
        <div className="mt-4 space-y-3">
          {rows.map((id) => (
            <Skeleton key={id} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div
      data-ocid="admin_recap.empty_state"
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CalendarDays className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
        {filtered
          ? "Tidak ada catatan yang cocok"
          : "Belum ada catatan kehadiran"}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered
          ? "Coba ubah filter tanggal atau karyawan untuk melihat catatan lain."
          : "Catatan kehadiran akan muncul di sini setelah karyawan melakukan absen masuk."}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-ocid="admin_recap.error_state"
      className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
        Gagal memuat rekap
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Terjadi kesalahan saat mengambil data kehadiran. Silakan coba lagi.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        data-ocid="admin_recap.retry_button"
        className="mt-4 rounded-xl"
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Coba lagi
      </Button>
    </div>
  );
}

export default function AdminRecapPage() {
  const { isAdmin, isRoleLoading } = useAuth();
  const [day, setDay] = useState<DayKey>(todayKey());
  const [userFilter, setUserFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AttendanceView | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const selectedUser: UserId | null = useMemo(() => {
    if (userFilter === ALL) return null;
    try {
      return Principal.fromText(userFilter);
    } catch {
      return null;
    }
  }, [userFilter]);

  const recapQuery = useAttendanceRecap(day || null, selectedUser);
  const locationsQuery = useWorkLocations();

  const records = useMemo<AttendanceView[]>(() => {
    const result = recapQuery.data;
    if (!result || result.__kind__ !== "ok") return [];
    return result.ok;
  }, [recapQuery.data]);

  const locationNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const location of locationsQuery.data ?? []) {
      map.set(location.id.toString(), location.name);
    }
    return map;
  }, [locationsQuery.data]);

  const employeeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const record of records) {
      const id = record.user.toString();
      if (!seen.has(id)) seen.set(id, shortPrincipal(id));
    }
    return Array.from(seen.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [records]);

  const visibleRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) => {
      const principal = record.user.toString().toLowerCase();
      const location = locationNames.get(record.locationId.toString()) ?? "";
      return principal.includes(term) || location.toLowerCase().includes(term);
    });
  }, [records, search, locationNames]);

  const counts = useMemo<RecapCounts>(() => {
    let clockedIn = 0;
    let clockedOut = 0;
    let notClockedOut = 0;
    for (const record of records) {
      clockedIn += 1;
      if (record.clockOut !== undefined) {
        clockedOut += 1;
      } else {
        notClockedOut += 1;
      }
    }
    return {
      total: records.length,
      clockedIn,
      clockedOut,
      notClockedOut,
    };
  }, [records]);

  const openDetail = (record: AttendanceView) => {
    setSelected(record);
    setDetailOpen(true);
  };

  if (isRoleLoading) {
    return (
      <section data-ocid="admin_recap.page" className="animate-fade-in">
        <LoadingState />
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section data-ocid="admin_recap.page" className="animate-fade-in">
        <AccessDenied />
      </section>
    );
  }

  const isError = recapQuery.isError || recapQuery.data?.__kind__ === "err";
  const isFiltered = search.trim().length > 0 || userFilter !== ALL;

  return (
    <section data-ocid="admin_recap.page" className="animate-fade-in space-y-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Lock className="size-3.5" aria-hidden="true" />
          Area Admin
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Rekap Kehadiran
        </h1>
        <p className="text-sm text-muted-foreground">
          Pantau kehadiran seluruh karyawan, lengkap dengan foto selfie dan
          lokasi GPS pada setiap catatan.
        </p>
      </header>

      {recapQuery.isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void recapQuery.refetch()} />
      ) : (
        <>
          <RecapSummary counts={counts} />

          <div className="rounded-2xl border border-border bg-card shadow-subtle">
            <div className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="recap-day"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Tanggal
                  </Label>
                  <Input
                    id="recap-day"
                    type="date"
                    value={day}
                    onChange={(event) => setDay(event.target.value)}
                    data-ocid="admin_recap.day_input"
                    className="h-9 rounded-lg"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="recap-employee"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Karyawan
                  </Label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger
                      id="recap-employee"
                      data-ocid="admin_recap.employee_select"
                      className="h-9 w-full rounded-lg lg:w-56"
                    >
                      <SelectValue placeholder="Semua karyawan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Semua karyawan</SelectItem>
                      {employeeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="recap-search"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Cari
                </Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="recap-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari karyawan atau lokasi…"
                    data-ocid="admin_recap.search_input"
                    className="h-9 w-full rounded-lg pl-9 lg:w-64"
                  />
                </div>
              </div>
            </div>

            {recapQuery.isFetching ? (
              <div
                data-ocid="admin_recap.refetching_state"
                className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground"
              >
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Memperbarui data…
              </div>
            ) : null}

            {visibleRecords.length === 0 ? (
              <div className="p-4">
                <EmptyState filtered={isFiltered} />
              </div>
            ) : (
              <Table data-ocid="admin_recap.table">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="pl-4">Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Masuk</TableHead>
                    <TableHead>Keluar</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRecords.map((record, index) => {
                    const locationName =
                      locationNames.get(record.locationId.toString()) ??
                      `Lokasi #${record.locationId.toString()}`;
                    return (
                      <TableRow
                        key={record.id.toString()}
                        data-ocid={`admin_recap.row.${index + 1}`}
                        className="cursor-pointer"
                        onClick={() => openDetail(record)}
                      >
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                              <Users className="size-4" aria-hidden="true" />
                            </span>
                            <span className="text-clock text-sm font-medium text-foreground">
                              {shortPrincipal(record.user.toString())}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDayKey(record.day)}
                        </TableCell>
                        <TableCell className="text-clock text-sm font-semibold text-foreground">
                          {formatClock(record.clockIn)}
                        </TableCell>
                        <TableCell className="text-clock text-sm text-foreground">
                          {formatClock(record.clockOut)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin
                              className="size-3.5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                            <span className="max-w-[10rem] truncate">
                              {locationName}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge record={record} />
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDetail(record);
                            }}
                            data-ocid={`admin_recap.detail_button.${index + 1}`}
                            className="rounded-lg text-primary"
                          >
                            Detail
                            <ChevronRight
                              className="size-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      <AttendanceDetailDialog
        record={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </section>
  );
}
