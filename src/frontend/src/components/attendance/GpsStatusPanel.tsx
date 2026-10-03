import { Button } from "@/components/ui/button";
import type { GeolocationStatus } from "@/hooks/useGeolocation";
import { cn } from "@/lib/utils";
import type { GpsPosition, WorkLocation } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  MapPinOff,
  Navigation,
} from "lucide-react";

export type GpsVerdict =
  | "idle"
  | "requesting"
  | "verified"
  | "outside"
  | "denied"
  | "unavailable"
  | "error";

export interface GpsEvaluation {
  verdict: GpsVerdict;
  /** Distance in metres to the nearest work location, when computable. */
  distanceMeters: number | null;
  /** The nearest configured work location, when any exist. */
  nearest: WorkLocation | null;
  /** Effective allowed radius of the nearest location, in metres. */
  radiusMeters: number | null;
}

/** Great-circle distance between two coordinates, in metres. */
function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const earthRadius = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Combine the raw geolocation status with the configured work locations to
 * decide whether the employee is inside an allowed radius.
 */
export function evaluateGps(
  status: GeolocationStatus,
  position: GpsPosition | null,
  locations: WorkLocation[],
): GpsEvaluation {
  if (status === "requesting") {
    return {
      verdict: "requesting",
      distanceMeters: null,
      nearest: null,
      radiusMeters: null,
    };
  }
  if (status === "denied") {
    return {
      verdict: "denied",
      distanceMeters: null,
      nearest: null,
      radiusMeters: null,
    };
  }
  if (status === "unavailable") {
    return {
      verdict: "unavailable",
      distanceMeters: null,
      nearest: null,
      radiusMeters: null,
    };
  }
  if (status === "error") {
    return {
      verdict: "error",
      distanceMeters: null,
      nearest: null,
      radiusMeters: null,
    };
  }
  if (status !== "granted" || !position) {
    return {
      verdict: "idle",
      distanceMeters: null,
      nearest: null,
      radiusMeters: null,
    };
  }
  if (locations.length === 0) {
    return {
      verdict: "unavailable",
      distanceMeters: null,
      nearest: null,
      radiusMeters: null,
    };
  }

  let nearest = locations[0];
  let nearestDistance = haversineMeters(
    position.latitude,
    position.longitude,
    nearest.latitude,
    nearest.longitude,
  );
  for (const location of locations.slice(1)) {
    const distance = haversineMeters(
      position.latitude,
      position.longitude,
      location.latitude,
      location.longitude,
    );
    if (distance < nearestDistance) {
      nearest = location;
      nearestDistance = distance;
    }
  }

  const radiusMeters = Number(nearest.radiusMeters);
  return {
    verdict: nearestDistance <= radiusMeters ? "verified" : "outside",
    distanceMeters: nearestDistance,
    nearest,
    radiusMeters,
  };
}

const VERDICT_STYLES: Record<
  GpsVerdict,
  { icon: typeof MapPin; tone: string; chip: string; label: string }
> = {
  idle: {
    icon: MapPin,
    tone: "text-muted-foreground",
    chip: "border-border bg-muted text-muted-foreground",
    label: "Lokasi belum diperiksa",
  },
  requesting: {
    icon: Loader2,
    tone: "text-info",
    chip: "border-info/30 bg-info/10 text-info",
    label: "Mendeteksi lokasi…",
  },
  verified: {
    icon: CheckCircle2,
    tone: "text-success",
    chip: "border-success/30 bg-success/10 text-success",
    label: "Lokasi terverifikasi",
  },
  outside: {
    icon: MapPinOff,
    tone: "text-warning",
    chip: "border-warning/40 bg-warning/15 text-warning",
    label: "Di luar radius",
  },
  denied: {
    icon: AlertTriangle,
    tone: "text-destructive",
    chip: "border-destructive/30 bg-destructive/10 text-destructive",
    label: "Izin lokasi ditolak",
  },
  unavailable: {
    icon: MapPinOff,
    tone: "text-destructive",
    chip: "border-destructive/30 bg-destructive/10 text-destructive",
    label: "Lokasi tidak tersedia",
  },
  error: {
    icon: AlertTriangle,
    tone: "text-destructive",
    chip: "border-destructive/30 bg-destructive/10 text-destructive",
    label: "Gagal membaca lokasi",
  },
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

interface GpsStatusPanelProps {
  evaluation: GpsEvaluation;
  message: string | null;
  isLoading: boolean;
  onRequest: () => void;
}

/**
 * GPS verification state for the attendance flow: permission, in-radius,
 * out-of-radius with distance, denied, and unavailable states.
 */
export function GpsStatusPanel({
  evaluation,
  message,
  isLoading,
  onRequest,
}: GpsStatusPanelProps) {
  const style = VERDICT_STYLES[evaluation.verdict];
  const Icon = style.icon;
  const isSpinning = evaluation.verdict === "requesting";

  const detail = (() => {
    switch (evaluation.verdict) {
      case "verified":
        return evaluation.nearest
          ? `Anda berada di area ${evaluation.nearest.name}.`
          : "Anda berada dalam radius lokasi kerja.";
      case "outside":
        return evaluation.distanceMeters !== null &&
          evaluation.radiusMeters !== null
          ? `Anda ${formatDistance(evaluation.distanceMeters)} dari ${evaluation.nearest?.name ?? "lokasi kerja"} (maksimal ${formatDistance(evaluation.radiusMeters)}).`
          : "Anda berada di luar radius lokasi kerja.";
      case "unavailable":
        return "Belum ada lokasi kerja yang diatur admin, sehingga lokasi Anda tidak dapat diverifikasi.";
      case "denied":
      case "error":
        return message ?? "Lokasi tidak dapat diverifikasi.";
      case "requesting":
        return "Mohon tunggu, sedang membaca koordinat Anda.";
      default:
        return "Periksa lokasi Anda sebelum melakukan absensi.";
    }
  })();

  const canRetry =
    evaluation.verdict === "denied" ||
    evaluation.verdict === "unavailable" ||
    evaluation.verdict === "error" ||
    evaluation.verdict === "outside";

  return (
    <div
      data-ocid="attendance.gps.panel"
      className="rounded-2xl border border-border bg-card p-4 shadow-subtle"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border",
            style.chip,
          )}
        >
          <Icon
            className={cn("size-5", isSpinning && "animate-spin")}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-ocid="attendance.gps.status"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                style.chip,
              )}
            >
              {style.label}
            </span>
            {evaluation.verdict === "verified" &&
            evaluation.distanceMeters !== null ? (
              <span className="text-xs text-muted-foreground">
                ± {formatDistance(evaluation.distanceMeters)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>

      {canRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRequest}
          disabled={isLoading}
          data-ocid="attendance.gps.retry_button"
          className="mt-3 h-9 w-full rounded-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Memeriksa…
            </>
          ) : (
            <>
              <Crosshair className="size-4" aria-hidden="true" />
              Periksa ulang lokasi
            </>
          )}
        </Button>
      ) : null}

      {evaluation.verdict === "verified" && evaluation.nearest ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Navigation className="size-3.5" aria-hidden="true" />
          {evaluation.nearest.latitude.toFixed(5)},{" "}
          {evaluation.nearest.longitude.toFixed(5)}
        </p>
      ) : null}
    </div>
  );
}
