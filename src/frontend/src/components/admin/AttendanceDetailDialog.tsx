import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { AttendanceView } from "@/types";
import { formatClock, formatDayKey } from "@/types";
import { Camera, MapPin, Navigation, UserRound } from "lucide-react";

function shortPrincipal(principal: string): string {
  return principal.length > 14
    ? `${principal.slice(0, 8)}…${principal.slice(-4)}`
    : principal;
}

function SelfieFrame({
  blob,
  label,
  emptyLabel,
}: {
  blob?: AttendanceView["clockInSelfie"];
  label: string;
  emptyLabel: string;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Camera className="size-3.5" aria-hidden="true" />
        {label}
      </figcaption>
      {blob ? (
        <img
          src={blob.getDirectURL()}
          alt={`Foto selfie ${label.toLowerCase()}`}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-xl border border-border bg-muted object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </figure>
  );
}

function PositionBlock({
  title,
  position,
  time,
}: {
  title: string;
  position?: AttendanceView["clockInPosition"];
  time: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="text-clock text-sm font-semibold text-foreground">
          {time}
        </span>
      </div>
      {position ? (
        <div className="mt-2 space-y-1.5 text-sm">
          <p className="flex items-center gap-1.5 text-foreground">
            <MapPin
              className="size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="text-clock">
              {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Navigation className="size-3.5 shrink-0" aria-hidden="true" />
            Akurasi ±{Math.round(position.accuracyMeters)} m
          </p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${position.latitude}&mlon=${position.longitude}#map=17/${position.latitude}/${position.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 transition-smooth hover:underline"
          >
            Lihat di peta
          </a>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Belum ada data lokasi.
        </p>
      )}
    </div>
  );
}

/** Detail view for one attendance record: selfie photos and GPS positions. */
export function AttendanceDetailDialog({
  record,
  open,
  onOpenChange,
}: {
  record: AttendanceView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const hasClockedOut = record?.clockOut !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="admin_recap.detail.dialog"
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      >
        {record ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold tracking-tight">
                Detail Kehadiran
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span>{formatDayKey(record.day)}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3.5" aria-hidden="true" />
                  <span className="text-clock">
                    {shortPrincipal(record.user.toString())}
                  </span>
                </span>
                <Badge
                  variant={hasClockedOut ? "secondary" : "default"}
                  className="rounded-full"
                >
                  {hasClockedOut ? "Sudah Keluar" : "Hadir"}
                </Badge>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelfieFrame
                blob={record.clockInSelfie}
                label="Selfie Masuk"
                emptyLabel="Tidak ada foto"
              />
              <SelfieFrame
                blob={record.clockOutSelfie}
                label="Selfie Keluar"
                emptyLabel="Belum absen keluar"
              />
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <PositionBlock
                title="Lokasi Masuk"
                position={record.clockInPosition}
                time={formatClock(record.clockIn)}
              />
              <PositionBlock
                title="Lokasi Keluar"
                position={record.clockOutPosition}
                time={formatClock(record.clockOut)}
              />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
