import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, LogOut, UserX } from "lucide-react";

export interface RecapCounts {
  total: number;
  clockedIn: number;
  clockedOut: number;
  notClockedOut: number;
}

interface SummaryCard {
  key: keyof RecapCounts;
  label: string;
  hint: string;
  icon: typeof Clock;
  tone: string;
}

const CARDS: SummaryCard[] = [
  {
    key: "total",
    label: "Total Catatan",
    hint: "Catatan absensi pada hari ini",
    icon: Clock,
    tone: "text-primary",
  },
  {
    key: "clockedIn",
    label: "Hadir",
    hint: "Catatan dengan absen masuk",
    icon: CheckCircle2,
    tone: "text-success",
  },
  {
    key: "clockedOut",
    label: "Sudah Keluar",
    hint: "Catatan dengan absen masuk dan keluar",
    icon: LogOut,
    tone: "text-info",
  },
  {
    key: "notClockedOut",
    label: "Belum Keluar",
    hint: "Catatan tanpa absen keluar",
    icon: UserX,
    tone: "text-muted-foreground",
  },
];

/** Summary tiles for the admin recap: total, hadir, sudah keluar, belum absen. */
export function RecapSummary({ counts }: { counts: RecapCounts }) {
  return (
    <div
      data-ocid="admin_recap.summary"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            data-ocid={`admin_recap.summary.${card.key}`}
            className="rounded-2xl border border-border bg-card p-4 shadow-subtle"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <Icon
                className={cn("size-4 shrink-0", card.tone)}
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground text-clock">
              {counts[card.key]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
