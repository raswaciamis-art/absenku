import { useCamera } from "@caffeineai/camera";
import { ExternalBlob } from "@caffeineai/object-storage";
import { useCallback, useState } from "react";

export interface UseSelfieCaptureReturn {
  /** Live camera preview ref — attach to a <video>. */
  videoRef: ReturnType<typeof useCamera>["videoRef"];
  /** Hidden capture canvas ref — attach to a <canvas>. */
  canvasRef: ReturnType<typeof useCamera>["canvasRef"];
  isActive: boolean;
  isSupported: boolean | null;
  isLoading: boolean;
  error: string | null;
  /** The captured selfie, or null before capture / after retake. */
  selfie: File | null;
  /** Object URL for previewing the captured selfie. */
  previewUrl: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => Promise<void>;
  capture: () => Promise<void>;
  retake: () => void;
}

/**
 * Front-camera selfie capture for the attendance flow.
 *
 * Wraps the platform `useCamera` hook, keeps the captured `File`, and exposes
 * a preview URL plus a retake action. The page task converts `selfie` into an
 * `ExternalBlob` via `selfieToExternalBlob` before calling clockIn/clockOut.
 */
export function useSelfieCapture(): UseSelfieCaptureReturn {
  const {
    isActive,
    isSupported,
    error: cameraError,
    isLoading,
    startCamera: start,
    stopCamera: stop,
    capturePhoto,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "user", width: 720, height: 960, quality: 0.85 });

  const [selfie, setSelfie] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    await start();
  }, [start]);

  const stopCamera = useCallback(async () => {
    await stop();
  }, [stop]);

  const capture = useCallback(async () => {
    const file = await capturePhoto();
    if (!file) return;
    setSelfie(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }, [capturePhoto]);

  const retake = useCallback(() => {
    setSelfie(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  return {
    videoRef,
    canvasRef,
    isActive,
    isSupported,
    isLoading,
    error: cameraError?.message ?? null,
    selfie,
    previewUrl,
    startCamera,
    stopCamera,
    capture,
    retake,
  };
}

/** Convert a captured selfie File into an uploadable ExternalBlob. */
export async function selfieToExternalBlob(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<ExternalBlob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const blob = ExternalBlob.fromBytes(bytes, file.type, file.name);
  return onProgress ? blob.withUploadProgress(onProgress) : blob;
}
