import type {
  AttendanceError,
  AttendanceView,
  DayKey,
  GpsPosition,
  LocationError,
  Result,
  Result_1,
  Result_2,
  Result_3,
  Timestamp,
  TodayStatus,
  UserId,
  WorkLocation,
} from "@/backend";
import { UserRole } from "@/backend";

export { UserRole };
export type {
  AttendanceError,
  AttendanceView,
  DayKey,
  GpsPosition,
  LocationError,
  Result,
  Result_1,
  Result_2,
  Result_3,
  Timestamp,
  TodayStatus,
  UserId,
  WorkLocation,
};

/** A user profile as stored by the backend authorization mixin. */
export interface UserProfile {
  name: string;
}

/** Route paths used across the app. */
export const ROUTES = {
  home: "/",
  history: "/riwayat",
  adminRecap: "/admin/rekap",
  adminLocations: "/admin/lokasi",
  profile: "/profil",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Convert a Motoko nanosecond timestamp into a JS Date. */
export function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a backend timestamp as a local HH:mm clock string. */
export function formatClock(timestamp: bigint | undefined): string {
  if (timestamp === undefined) return "--:--";
  const date = timestampToDate(timestamp);
  if (!date) return "--:--";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format a backend timestamp as a long Indonesian date. */
export function formatLongDate(timestamp: bigint | undefined): string {
  if (timestamp === undefined) return "—";
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Format a YYYY-MM-DD day key as a readable Indonesian date. */
export function formatDayKey(day: DayKey): string {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Today's date as a YYYY-MM-DD key in local time. */
export function todayKey(): DayKey {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Human-readable Indonesian message for an attendance error. */
export function attendanceErrorMessage(error: AttendanceError): string {
  switch (error.__kind__) {
    case "notClockedIn":
      return "Anda belum melakukan absen masuk hari ini.";
    case "noLocationConfigured":
      return "Belum ada lokasi kerja yang diatur admin.";
    case "alreadyClockedOut":
      return "Anda sudah melakukan absen keluar hari ini.";
    case "outsideRadius":
      return `Anda berada ${Math.round(error.outsideRadius.distanceMeters)} m dari lokasi (maksimal ${error.outsideRadius.radiusMeters.toString()} m).`;
    case "invalidCoordinates":
      return "Koordinat lokasi tidak valid.";
    case "alreadyClockedIn":
      return "Anda sudah melakukan absen masuk hari ini.";
    case "notRegistered":
      return "Akun Anda belum terdaftar. Hubungi admin.";
    default:
      return "Terjadi kesalahan saat memproses absensi.";
  }
}

/** Human-readable Indonesian message for a work-location error. */
export function locationErrorMessage(error: LocationError): string {
  switch (error.__kind__) {
    case "invalidLocation":
      return "Data lokasi tidak valid. Periksa nama, koordinat, dan radius.";
    case "notFound":
      return "Lokasi kerja tidak ditemukan.";
    case "notAdmin":
      return "Hanya admin yang dapat mengelola lokasi kerja.";
    default:
      return "Terjadi kesalahan pada data lokasi.";
  }
}
