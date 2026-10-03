import {
  GpsStatusPanel,
  evaluateGps,
} from "@/components/attendance/GpsStatusPanel";
import { SelfieCapturePanel } from "@/components/attendance/SelfieCapturePanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  useClockIn,
  useClockOut,
  useTodayStatus,
  useWorkLocations,
} from "@/hooks/useQueries";
import {
  selfieToExternalBlob,
  useSelfieCapture,
} from "@/hooks/useSelfieCapture";
import { cn } from "@/lib/utils";
import {
  type AttendanceError,
  type Result_3,
  attendanceErrorMessage,
  formatClock,
  formatLongDate,
} from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ActionKind = "in" | "out";

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function formatLiveClock(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const STATUS_META = {
  notClockedIn: {
    label: "Belum Absen",
    chip: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  clockedIn: {
    label: "Sudah Masuk",
    chip: "border-success/30 bg-success/10 text-success",
    dot: "bg-success",
  },
  clockedOut: {
    label: "Sudah Keluar",
    chip: "border-warning/40 bg-warning/15 text-warning",
    dot: "bg-warning",
  },
} as const;

export default function AttendancePage() {
  const now = useNow();
  const { isAdmin } = useAuth();
  const todayQuery = useTodayStatus();
  const locationsQuery = useWorkLocations();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const geo = useGeolocation();
  const selfie = useSelfieCapture();

  const [pendingAction, setPendingAction] = useState<ActionKind | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const status = todayQuery.data;
  const locations = locationsQuery.data ?? [];

  const gps = useMemo(
    () => evaluateGps(geo.status, geo.position, locations),
    [geo.status, geo.position, locations],
  );

  const hasClockedIn =
    status?.__kind__ === "clockedIn" || status?.__kind__ === "clockedOut";
  const hasClockedOut = status?.__kind__ === "clockedOut";

  const clockInTime =
    status?.__kind__ === "clockedIn"
      ? status.clockedIn.clockIn
      : status?.__kind__ === "clockedOut"
        ? status.clockedOut.clockIn
        : undefined;
  const clockOutTime =
    status?.__kind__ === "clockedOut" ? status.clockedOut.clockOut : undefined;

  const statusMeta = STATUS_META[status?.__kind__ ?? "notClockedIn"];

  const gpsReady = gps.verdict === "verified";
  const selfieReady = selfie.selfie !== null;
  const isSubmitting = pendingAction !== null;

  const canClockIn = !hasClockedIn && gpsReady && selfieReady && !isSubmitting;
  const canClockOut =
    hasClockedIn && !hasClockedOut && gpsReady && selfieReady && !isSubmitting;

  const missingHint = (() => {
    if (!gpsReady && !selfieReady) {
      return "Verifikasi lokasi dan ambil selfie terlebih dahulu.";
    }
    if (!gpsReady) return "Verifikasi lokasi Anda terlebih dahulu.";
    if (!selfieReady) return "Ambil selfie terlebih dahulu.";
    return null;
  })();

  async function submit(kind: ActionKind) {
    if (!selfie.selfie) {
      setActionError("Selfie wajib diambil sebelum absen.");
      return;
    }
    setActionError(null);
    setPendingAction(kind);
    setUploadPct(0);

    try {
      const position = geo.position ?? (await geo.requestPosition());
      if (!position) {
        setActionError(
          geo.message ?? "Lokasi tidak tersedia. Coba periksa ulang lokasi.",
        );
        return;
      }

      const blob = await selfieToExternalBlob(selfie.selfie, (pct) =>
        setUploadPct(pct),
      );

      const result: Result_3 =
        kind === "in"
          ? await clockIn.mutateAsync({ position, selfie: blob })
          : await clockOut.mutateAsync({ position, selfie: blob });

      if (result.__kind__ === "err") {
        const message = attendanceErrorMessage(result.err as AttendanceError);
        setActionError(message);
        toast.error(message);
        return;
      }

      const label = kind === "in" ? "Absen masuk" : "Absen keluar";
      toast.success(
        `${label} berhasil dicatat pukul ${formatClock(
          kind === "in" ? result.ok.clockIn : result.ok.clockOut,
        )}.`,
      );
      selfie.retake();
      geo.reset();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses absensi.";
      setActionError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
      setUploadPct(null);
    }
  }

  return (
    <section data-ocid="attendance.page" className="animate-fade-in space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Absensi Hari Ini
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatLongDate(BigInt(now.getTime()) * 1_000_000n)}
          </p>
        </div>
        <span
          data-ocid="attendance.status.chip"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
            statusMeta.chip,
          )}
        >
          <span
            className={cn("size-2 rounded-full", statusMeta.dot)}
            aria-hidden="true"
          />
          {statusMeta.label}
        </span>
      </header>

      {/* Clock card */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div className="bg-gradient-primary px-6 py-7 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
            Waktu saat ini
          </p>
          <p
            data-ocid="attendance.clock"
            className="text-clock mt-1 text-5xl font-bold leading-none sm:text-6xl"
          >
            {formatLiveClock(now)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-xs font-medium opacity-80">
                <LogIn className="size-3.5" aria-hidden="true" />
                Jam Masuk
              </p>
              <p
                data-ocid="attendance.clock_in_time"
                className="text-clock mt-1 text-2xl font-bold"
              >
                {formatClock(clockInTime)}
              </p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-xs font-medium opacity-80">
                <LogOut className="size-3.5" aria-hidden="true" />
                Jam Keluar
              </p>
              <p
                data-ocid="attendance.clock_out_time"
                className="text-clock mt-1 text-2xl font-bold"
              >
                {formatClock(clockOutTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-5">
          {todayQuery.isLoading ? (
            <div
              data-ocid="attendance.status.loading_state"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Memuat status kehadiran…
            </div>
          ) : null}

          {todayQuery.isError ? (
            <p
              role="alert"
              data-ocid="attendance.status.error_state"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              Gagal memuat status kehadiran. Muat ulang halaman untuk mencoba
              lagi.
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            onClick={() => submit("in")}
            disabled={!canClockIn}
            data-ocid="attendance.clock_in_button"
            className="h-12 w-full rounded-xl text-base shadow-card"
          >
            {pendingAction === "in" ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                {uploadPct !== null && uploadPct < 100
                  ? `Mengunggah selfie ${uploadPct}%`
                  : "Mencatat absen masuk…"}
              </>
            ) : (
              <>
                <LogIn className="size-5" aria-hidden="true" />
                {hasClockedIn ? "Sudah Absen Masuk" : "Absen Masuk"}
              </>
            )}
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => submit("out")}
            disabled={!canClockOut}
            data-ocid="attendance.clock_out_button"
            className={cn(
              "h-12 w-full rounded-xl border-accent/50 text-base text-accent-foreground shadow-subtle",
              canClockOut && "bg-accent/15 hover:bg-accent/25",
            )}
          >
            {pendingAction === "out" ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                {uploadPct !== null && uploadPct < 100
                  ? `Mengunggah selfie ${uploadPct}%`
                  : "Mencatat absen keluar…"}
              </>
            ) : (
              <>
                <LogOut className="size-5" aria-hidden="true" />
                {hasClockedOut ? "Sudah Absen Keluar" : "Absen Keluar"}
              </>
            )}
          </Button>

          {missingHint && !hasClockedOut ? (
            <p className="text-center text-xs text-muted-foreground">
              {missingHint}
            </p>
          ) : null}

          {hasClockedOut ? (
            <p
              data-ocid="attendance.status.success_state"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Absensi hari ini sudah lengkap. Terima kasih!
            </p>
          ) : null}

          {actionError ? (
            <p
              role="alert"
              data-ocid="attendance.action.error_state"
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {actionError}
            </p>
          ) : null}
        </div>
      </div>

      {/* Verification requirements */}
      <div className="grid gap-4 md:grid-cols-2">
        <GpsStatusPanel
          evaluation={gps}
          message={geo.message}
          isLoading={geo.isLoading}
          onRequest={() => void geo.requestPosition()}
        />
        <SelfieCapturePanel
          videoRef={selfie.videoRef}
          canvasRef={selfie.canvasRef}
          isActive={selfie.isActive}
          isSupported={selfie.isSupported}
          isLoading={selfie.isLoading}
          error={selfie.error}
          previewUrl={selfie.previewUrl}
          hasSelfie={selfieReady}
          onStart={() => void selfie.startCamera()}
          onCapture={() => void selfie.capture()}
          onRetake={selfie.retake}
        />
      </div>

      {/* Requirement summary */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5" aria-hidden="true" />
          Absensi wajib GPS
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Absensi wajib selfie
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden="true" />
          Jam masuk &amp; keluar tercatat otomatis
        </span>
      </div>

      {isAdmin ? (
        <p className="text-xs text-muted-foreground">
          Anda masuk sebagai admin. Kelola lokasi kerja dan rekap kehadiran
          melalui menu di samping.
        </p>
      ) : null}
    </section>
  );
}
