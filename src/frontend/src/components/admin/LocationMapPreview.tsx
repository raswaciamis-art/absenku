import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

interface LocationMapPreviewProps {
  latitude: number;
  longitude: number;
  radiusMeters: bigint;
  className?: string;
}

/**
 * Lightweight coordinate readout with a schematic radius preview.
 * No external map tiles — renders the center point and a scaled radius ring
 * so admins can sanity-check the configured area at a glance.
 */
export function LocationMapPreview({
  latitude,
  longitude,
  radiusMeters,
  className,
}: LocationMapPreviewProps) {
  const radius = Number(radiusMeters);
  // Map radius (m) to a ring diameter in px, clamped to the preview box.
  const ringSize = Math.min(140, Math.max(28, Math.round(radius / 4)));

  return (
    <div
      className={cn(
        "relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/60",
        className,
      )}
      data-ocid="admin_locations.map_preview"
      aria-label={`Pratinjau lokasi pada ${latitude.toFixed(4)}, ${longitude.toFixed(4)} dengan radius ${radius} meter`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute rounded-full border-2 border-primary/40 bg-primary/10"
        style={{ width: ringSize, height: ringSize }}
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col items-center gap-1">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card">
          <MapPin className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="absolute bottom-2 left-2 rounded-md bg-card/90 px-2 py-1 font-mono text-[0.65rem] tabular-nums text-muted-foreground shadow-subtle">
        {latitude.toFixed(5)}, {longitude.toFixed(5)} · {radius} m
      </div>
    </div>
  );
}
