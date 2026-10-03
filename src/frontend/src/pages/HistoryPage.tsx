import { AttendanceHistoryRow } from "@/components/history/AttendanceHistoryRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAttendance, useWorkLocations } from "@/hooks/useQueries";
import type { AttendanceView } from "@/types";
import { Link } from "@tanstack/react-router";
import { CalendarClock, History, RefreshCw } from "lucide-react";
import { useMemo } from "react";

const SKELETON_IDS = Array.from(
  { length: 4 },
  (_, i) => `history-skeleton-${i}`,
);

/** Sort records newest-first by clock-in time. */
function sortByNewest(records: AttendanceView[]): AttendanceView[] {
  return [...records].sort((a, b) => (a.clockIn > b.clockIn ? -1 : 1));
}

function HistorySkeleton() {
  return (
    <ul
      data-ocid="history.loading_state"
      className="flex flex-col gap-3"
      aria-hidden="true"
    >
      {SKELETON_IDS.map((id) => (
        <li
          key={id}
          className="rounded-2xl border border-border bg-card p-4 shadow-subtle"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div
      data-ocid="history.empty_state"
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-subtle"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
        <History className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
        Belum ada riwayat absensi
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Riwayat absen masuk dan keluar Anda akan muncul di sini setelah Anda
        melakukan absensi pertama.
      </p>
      <Button
        asChild
        type="button"
        data-ocid="history.primary_button"
        className="mt-5 rounded-full"
      >
        <Link to="/">Mulai absen sekarang</Link>
      </Button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-ocid="history.error_state"
      className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
        Gagal memuat riwayat
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Terjadi kesalahan saat mengambil data absensi Anda. Silakan coba lagi.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        data-ocid="history.retry_button"
        className="mt-5 rounded-full"
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Coba lagi
      </Button>
    </div>
  );
}

/**
 * Personal attendance history: the signed-in employee's own records in
 * reverse-chronological order with expandable selfie and GPS detail.
 */
export default function HistoryPage() {
  const attendance = useMyAttendance();
  const locations = useWorkLocations();

  const locationNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const location of locations.data ?? []) {
      map.set(location.id.toString(), location.name);
    }
    return map;
  }, [locations.data]);

  const records = useMemo(
    () => sortByNewest(attendance.data ?? []),
    [attendance.data],
  );

  const isLoading = attendance.isLoading || locations.isLoading;
  const isError = attendance.isError;

  return (
    <section data-ocid="history.page" className="animate-fade-in">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <CalendarClock className="size-4" aria-hidden="true" />
          Presensi Pribadi
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Riwayat Absensi
        </h1>
        <p className="text-sm text-muted-foreground">
          Catatan jam masuk, jam keluar, lokasi, dan selfie absensi Anda.
        </p>
      </header>

      <div className="mt-6">
        {isLoading ? (
          <HistorySkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => void attendance.refetch()} />
        ) : records.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {records.length} catatan
              </p>
              <p className="text-xs text-muted-foreground">Terbaru di atas</p>
            </div>
            <ul data-ocid="history.list" className="flex flex-col gap-3">
              {records.map((record, index) => (
                <AttendanceHistoryRow
                  key={record.id.toString()}
                  record={record}
                  index={index}
                  locationName={
                    locationNames.get(record.locationId.toString()) ??
                    "Lokasi tidak diketahui"
                  }
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
