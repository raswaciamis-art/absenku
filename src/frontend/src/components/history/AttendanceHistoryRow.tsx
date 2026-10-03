import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttendanceView, GpsPosition, WorkLocation } from "@/types";
import { formatClock, formatLongDate } from "@/types";
import { ChevronDown, Clock, LogIn, LogOut, MapPin } from "lucide-react";
import { useId, useState } from "react";

/** Format a GPS position as a readable coordinate pair. */
function formatCoordinates(position: GpsPosition): string {
  return `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`;
}

/** A single selfie thumbnail with a labelled caption. */
function SelfieThumb({
  label,
  src,
  alt,
  className,
}: {
  label: string;
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="aspect-square w-full rounded-xl border border-border object-cover shadow-subtle"
      />
      <figcaption className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}

/** A labelled GPS coordinate block for the expanded detail. */
function CoordinateBlock({
  label,
  position,
  icon: Icon,
}: {
  label: string;
  position: GpsPosition;
  icon: typeof MapPin;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1.5 text-clock text-sm font-semibold text-foreground">
        {formatCoordinates(position)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Akurasi ±{Math.round(position.accuracyMeters)} m
      </p>
    </div>
  );
}

interface AttendanceHistoryRowProps {
  record: AttendanceView;
  locationName: string;
  index: number;
}

/**
 * One attendance record: date, clock-in/out times, location, and selfie
 * thumbnails, with an expandable detail showing full selfies and GPS.
 */
export function AttendanceHistoryRow({
  record,
  locationName,
  index,
}: AttendanceHistoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const hasClockedOut = record.clockOut !== undefined;

  return (
    <li
      data-ocid={`history.item.${index + 1}`}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-subtle transition-smooth hover:shadow-card"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold tracking-tight text-foreground">
            {formatLongDate(record.clockIn)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{locationName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LogIn className="size-4 text-success" aria-hidden="true" />
            <span className="text-clock text-lg font-bold text-foreground">
              {formatClock(record.clockIn)}
            </span>
          </div>
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
          <div className="flex items-center gap-2">
            <LogOut
              className={cn(
                "size-4",
                hasClockedOut ? "text-accent" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "text-clock text-lg font-bold",
                hasClockedOut ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {formatClock(record.clockOut)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Badge
            variant={hasClockedOut ? "secondary" : "outline"}
            className={cn(
              "rounded-full px-2.5 py-1 text-[0.7rem] font-semibold",
              hasClockedOut
                ? "border-transparent bg-success/15 text-success"
                : "border-accent/40 bg-accent/10 text-accent-foreground",
            )}
          >
            {hasClockedOut ? "Selesai" : "Sudah Masuk"}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={detailId}
            data-ocid={`history.expand_button.${index + 1}`}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <span className="hidden sm:inline">
              {expanded ? "Tutup" : "Detail"}
            </span>
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {expanded && (
        <div
          id={detailId}
          data-ocid={`history.detail.${index + 1}`}
          className="animate-fade-in border-t border-border bg-muted/30 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-3">
              <SelfieThumb
                label="Selfie masuk"
                src={record.clockInSelfie.getDirectURL()}
                alt={`Selfie absen masuk ${formatLongDate(record.clockIn)}`}
              />
              {record.clockOutSelfie ? (
                <SelfieThumb
                  label="Selfie keluar"
                  src={record.clockOutSelfie.getDirectURL()}
                  alt={`Selfie absen keluar ${formatLongDate(record.clockIn)}`}
                />
              ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card text-center">
                  <Clock
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="px-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                    Belum absen keluar
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <CoordinateBlock
                label="Koordinat masuk"
                position={record.clockInPosition}
                icon={LogIn}
              />
              {record.clockOutPosition ? (
                <CoordinateBlock
                  label="Koordinat keluar"
                  position={record.clockOutPosition}
                  icon={LogOut}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card p-3 text-xs text-muted-foreground">
                  Koordinat keluar belum tersedia.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
