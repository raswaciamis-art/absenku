import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { RefObject } from "react";

interface SelfieCapturePanelProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  isSupported: boolean | null;
  isLoading: boolean;
  error: string | null;
  previewUrl: string | null;
  hasSelfie: boolean;
  onStart: () => void;
  onCapture: () => void;
  onRetake: () => void;
}

/**
 * Mandatory front-camera selfie step: live preview, capture, and retake with
 * a confirmation preview before the attendance action can be submitted.
 */
export function SelfieCapturePanel({
  videoRef,
  canvasRef,
  isActive,
  isSupported,
  isLoading,
  error,
  previewUrl,
  hasSelfie,
  onStart,
  onCapture,
  onRetake,
}: SelfieCapturePanelProps) {
  const unsupported = isSupported === false;

  return (
    <div
      data-ocid="attendance.selfie.panel"
      className="rounded-2xl border border-border bg-card p-4 shadow-subtle"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Camera className="size-4" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">
              Selfie Wajib
            </p>
            <p className="text-xs text-muted-foreground">
              Ambil foto sebelum absen
            </p>
          </div>
        </div>
        {hasSelfie ? (
          <span
            data-ocid="attendance.selfie.success_state"
            className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success"
          >
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Siap
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
            Belum ada
          </span>
        )}
      </div>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-muted">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Pratinjau selfie"
            data-ocid="attendance.selfie.preview"
            className="size-full object-cover"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              data-ocid="attendance.selfie.video"
              className={cn("size-full object-cover", !isActive && "opacity-0")}
            />
            {!isActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                {unsupported ? (
                  <>
                    <CameraOff
                      className="size-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-foreground">
                      Kamera tidak didukung
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Perangkat atau browser ini tidak menyediakan akses kamera.
                    </p>
                  </>
                ) : (
                  <>
                    <Camera
                      className="size-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-foreground">
                      Kamera depan belum aktif
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aktifkan kamera untuk mengambil selfie.
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error ? (
        <p
          role="alert"
          data-ocid="attendance.selfie.error_state"
          className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-3">
        {hasSelfie ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRetake}
            data-ocid="attendance.selfie.retake_button"
            className="h-11 w-full rounded-xl"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Ambil ulang
          </Button>
        ) : isActive ? (
          <Button
            type="button"
            onClick={onCapture}
            disabled={isLoading}
            data-ocid="attendance.selfie.capture_button"
            className="h-11 w-full rounded-xl shadow-card"
          >
            <Camera className="size-4" aria-hidden="true" />
            Ambil Selfie
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onStart}
            disabled={isLoading || unsupported}
            data-ocid="attendance.selfie.start_button"
            className="h-11 w-full rounded-xl shadow-card"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Menyiapkan kamera…
              </>
            ) : (
              <>
                <RefreshCw className="size-4" aria-hidden="true" />
                Aktifkan Kamera
              </>
            )}
          </Button>
        )}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Foto selfie tersimpan bersama catatan absensi Anda.
      </p>
    </div>
  );
}
