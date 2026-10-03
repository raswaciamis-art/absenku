import { LocationFormDialog } from "@/components/admin/LocationFormDialog";
import { LocationMapPreview } from "@/components/admin/LocationMapPreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddWorkLocation,
  useDeleteWorkLocation,
  useUpdateWorkLocation,
  useWorkLocations,
} from "@/hooks/useQueries";
import { type WorkLocation, locationErrorMessage } from "@/types";
import {
  Loader2,
  MapPin,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function AccessDenied() {
  return (
    <section
      data-ocid="admin_locations.access_denied_state"
      className="animate-fade-in rounded-2xl border border-border bg-card p-8 text-center shadow-card"
    >
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground">
        Akses ditolak
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Halaman pengelolaan lokasi kerja hanya dapat diakses oleh admin. Hubungi
        admin jika Anda memerlukan perubahan lokasi.
      </p>
    </section>
  );
}

function LoadingState() {
  const ids = Array.from({ length: 3 }, (_, i) => `location-skeleton-${i}`);
  return (
    <div
      className="flex flex-col gap-3"
      data-ocid="admin_locations.loading_state"
    >
      {ids.map((id) => (
        <div
          key={id}
          className="rounded-2xl border border-border bg-card p-5 shadow-subtle"
        >
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-3 h-4 w-64" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      data-ocid="admin_locations.empty_state"
      className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-subtle"
    >
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
        <MapPin className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
        Belum ada lokasi kerja
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Tambahkan lokasi pertama agar karyawan dapat melakukan absensi dengan
        verifikasi GPS.
      </p>
      <Button
        type="button"
        onClick={onAdd}
        data-ocid="admin_locations.empty_add_button"
        className="mt-5 rounded-lg shadow-card"
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Lokasi
      </Button>
    </div>
  );
}

interface LocationCardProps {
  location: WorkLocation;
  index: number;
  onEdit: (location: WorkLocation) => void;
  onDelete: (location: WorkLocation) => void;
}

function LocationCard({
  location,
  index,
  onEdit,
  onDelete,
}: LocationCardProps) {
  return (
    <article
      data-ocid={`admin_locations.item.${index + 1}`}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-subtle transition-smooth hover:shadow-card md:grid-cols-[1fr_auto]"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold tracking-tight text-foreground">
              {location.name}
            </h3>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Radius {location.radiusMeters.toString()} m
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2 md:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(location)}
          data-ocid={`admin_locations.edit_button.${index + 1}`}
          className="rounded-lg"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Ubah
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(location)}
          data-ocid={`admin_locations.delete_button.${index + 1}`}
          className="rounded-lg text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Hapus
        </Button>
      </div>
    </article>
  );
}

export default function AdminLocationsPage() {
  const { isAdmin, isRoleLoading } = useAuth();
  const locationsQuery = useWorkLocations();
  const addLocation = useAddWorkLocation();
  const updateLocation = useUpdateWorkLocation();
  const deleteLocation = useDeleteWorkLocation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLocation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkLocation | null>(null);

  if (isRoleLoading) {
    return (
      <section data-ocid="admin_locations.page" className="animate-fade-in">
        <LoadingState />
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section data-ocid="admin_locations.page" className="animate-fade-in">
        <AccessDenied />
      </section>
    );
  }

  const locations = locationsQuery.data ?? [];
  const isSubmitting = addLocation.isPending || updateLocation.isPending;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(location: WorkLocation) {
    setEditing(location);
    setFormOpen(true);
  }

  async function handleSubmit(values: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: bigint;
  }) {
    if (editing) {
      const result = await updateLocation.mutateAsync({
        id: editing.id,
        ...values,
      });
      if (result.__kind__ === "err") {
        throw new Error(locationErrorMessage(result.err));
      }
      toast.success("Lokasi kerja diperbarui.");
    } else {
      const result = await addLocation.mutateAsync(values);
      if (result.__kind__ === "err") {
        throw new Error(locationErrorMessage(result.err));
      }
      toast.success("Lokasi kerja ditambahkan.");
    }
    setFormOpen(false);
    setEditing(null);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      const result = await deleteLocation.mutateAsync(pendingDelete.id);
      if (result.__kind__ === "err") {
        toast.error(locationErrorMessage(result.err));
      } else {
        toast.success("Lokasi kerja dihapus.");
      }
    } catch {
      toast.error("Gagal menghapus lokasi. Coba lagi.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <section data-ocid="admin_locations.page" className="animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pengaturan Admin
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            Lokasi Kerja
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Kelola titik lokasi dan radius toleransi yang dipakai untuk
            verifikasi GPS saat absensi.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          data-ocid="admin_locations.add_button"
          className="w-fit rounded-lg shadow-card"
        >
          <Plus className="size-4" aria-hidden="true" />
          Tambah Lokasi
        </Button>
      </header>

      <div className="mt-6">
        {locationsQuery.isLoading ? (
          <LoadingState />
        ) : locationsQuery.isError ? (
          <div
            data-ocid="admin_locations.error_state"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center"
          >
            <p className="text-sm text-destructive">
              Gagal memuat daftar lokasi kerja.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void locationsQuery.refetch()}
              data-ocid="admin_locations.retry_button"
              className="mt-4 rounded-lg"
            >
              {locationsQuery.isFetching ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Coba lagi
            </Button>
          </div>
        ) : locations.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <div className="flex flex-col gap-3">
            {locations.map((location, index) => (
              <LocationCard
                key={location.id.toString()}
                location={location}
                index={index}
                onEdit={openEdit}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        )}
      </div>

      {locations.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pratinjau lokasi terakhir
          </h2>
          <LocationMapPreview
            latitude={locations[locations.length - 1].latitude}
            longitude={locations[locations.length - 1].longitude}
            radiusMeters={locations[locations.length - 1].radiusMeters}
          />
        </div>
      ) : null}

      <LocationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        location={editing}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="admin_locations.delete_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Hapus lokasi kerja?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.name}" akan dihapus permanen. Karyawan tidak lagi dapat absen di lokasi ini.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="admin_locations.delete_cancel_button"
              className="rounded-lg"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleteLocation.isPending}
              data-ocid="admin_locations.delete_confirm_button"
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLocation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
