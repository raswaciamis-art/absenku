import type { GpsPosition } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "error";

export interface UseGeolocationReturn {
  /** Latest reading, or null before the first successful fix. */
  position: GpsPosition | null;
  status: GeolocationStatus;
  /** Indonesian, user-facing message for the current status. */
  message: string | null;
  isLoading: boolean;
  /** Request a fresh high-accuracy fix. Resolves with the reading or null. */
  requestPosition: () => Promise<GpsPosition | null>;
  /** Clear the current reading and status back to idle. */
  reset: () => void;
}

const MESSAGES: Record<GeolocationStatus, string | null> = {
  idle: null,
  requesting: "Mendeteksi lokasi Anda…",
  granted: "Lokasi terverifikasi.",
  denied:
    "Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser untuk melanjutkan absensi.",
  unavailable:
    "Lokasi tidak tersedia. Pastikan GPS aktif dan Anda berada di area terbuka.",
  error: "Gagal membaca lokasi. Coba lagi sebentar lagi.",
};

/**
 * Browser Geolocation API wrapper used by the attendance flow.
 *
 * There is no platform geolocation extension, so this calls
 * `navigator.geolocation` directly and normalizes the result into the
 * backend `GpsPosition` shape.
 */
export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const requestPosition = useCallback(async (): Promise<GpsPosition | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return null;
    }

    setStatus("requesting");

    return new Promise<GpsPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (result) => {
          if (!mountedRef.current) {
            resolve(null);
            return;
          }
          const reading: GpsPosition = {
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
            accuracyMeters: Math.round(result.coords.accuracy),
          };
          setPosition(reading);
          setStatus("granted");
          resolve(reading);
        },
        (error) => {
          if (!mountedRef.current) {
            resolve(null);
            return;
          }
          if (error.code === error.PERMISSION_DENIED) {
            setStatus("denied");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setStatus("unavailable");
          } else {
            setStatus("error");
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
      );
    });
  }, []);

  const reset = useCallback(() => {
    setPosition(null);
    setStatus("idle");
  }, []);

  return {
    position,
    status,
    message: MESSAGES[status],
    isLoading: status === "requesting",
    requestPosition,
    reset,
  };
}
