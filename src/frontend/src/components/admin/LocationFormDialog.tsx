import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type WorkLocation, locationErrorMessage } from "@/types";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface LocationFormValues {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: bigint;
}

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing location when editing; `null` when creating. */
  location: WorkLocation | null;
  onSubmit: (values: LocationFormValues) => Promise<void>;
  isSubmitting: boolean;
}

interface FormErrors {
  name?: string;
  latitude?: string;
  longitude?: string;
  radiusMeters?: string;
}

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function validate(
  name: string,
  latitude: string,
  longitude: string,
  radius: string,
): FormErrors {
  const errors: FormErrors = {};
  if (name.trim() === "") {
    errors.name = "Nama lokasi wajib diisi.";
  }
  const lat = parseNumber(latitude);
  if (lat === null) {
    errors.latitude = "Latitude wajib diisi.";
  } else if (lat < LAT_MIN || lat > LAT_MAX) {
    errors.latitude = `Latitude harus antara ${LAT_MIN} dan ${LAT_MAX}.`;
  }
  const lng = parseNumber(longitude);
  if (lng === null) {
    errors.longitude = "Longitude wajib diisi.";
  } else if (lng < LNG_MIN || lng > LNG_MAX) {
    errors.longitude = `Longitude harus antara ${LNG_MIN} dan ${LNG_MAX}.`;
  }
  const rad = parseNumber(radius);
  if (rad === null) {
    errors.radiusMeters = "Radius wajib diisi.";
  } else if (rad <= 0) {
    errors.radiusMeters = "Radius harus lebih besar dari 0 meter.";
  }
  return errors;
}

/**
 * Create / edit dialog for a work location. Owns its own draft state and
 * validates name, coordinate ranges, and a positive radius before submitting.
 */
export function LocationFormDialog({
  open,
  onOpenChange,
  location,
  onSubmit,
  isSubmitting,
}: LocationFormDialogProps) {
  const isEditing = location !== null;
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("100");
  const [errors, setErrors] = useState<FormErrors>({});
  const [locating, setLocating] = useState(false);

  // Re-seed the draft only when the dialog opens for a specific record.
  useEffect(() => {
    if (!open) return;
    if (location) {
      setName(location.name);
      setLatitude(String(location.latitude));
      setLongitude(String(location.longitude));
      setRadius(location.radiusMeters.toString());
    } else {
      setName("");
      setLatitude("");
      setLongitude("");
      setRadius("100");
    }
    setErrors({});
  }, [open, location]);

  function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Perangkat ini tidak mendukung geolokasi.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setErrors((prev) => ({
          ...prev,
          latitude: undefined,
          longitude: undefined,
        }));
        setLocating(false);
        toast.success("Koordinat diisi dari lokasi Anda saat ini.");
      },
      () => {
        setLocating(false);
        toast.error(
          "Gagal mengambil lokasi. Izinkan akses lokasi lalu coba lagi.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(name, latitude, longitude, radius);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const lat = parseNumber(latitude);
    const lng = parseNumber(longitude);
    const rad = parseNumber(radius);
    if (lat === null || lng === null || rad === null) return;

    try {
      await onSubmit({
        name: name.trim(),
        latitude: lat,
        longitude: lng,
        radiusMeters: BigInt(Math.round(rad)),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan lokasi.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="admin_locations.form.dialog"
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? "Ubah Lokasi Kerja" : "Tambah Lokasi Kerja"}
          </DialogTitle>
          <DialogDescription>
            Tentukan nama, koordinat pusat, dan radius toleransi absensi.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location-name">Nama lokasi</Label>
            <Input
              id="location-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Kantor Pusat Jakarta"
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
              data-ocid="admin_locations.form.name_input"
            />
            {errors.name ? (
              <p
                className="text-xs text-destructive"
                data-ocid="admin_locations.form.name_error"
              >
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location-latitude">Latitude</Label>
              <Input
                id="location-latitude"
                inputMode="decimal"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                placeholder="-6.208800"
                autoComplete="off"
                aria-invalid={Boolean(errors.latitude)}
                data-ocid="admin_locations.form.latitude_input"
              />
              {errors.latitude ? (
                <p
                  className="text-xs text-destructive"
                  data-ocid="admin_locations.form.latitude_error"
                >
                  {errors.latitude}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location-longitude">Longitude</Label>
              <Input
                id="location-longitude"
                inputMode="decimal"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                placeholder="106.845600"
                autoComplete="off"
                aria-invalid={Boolean(errors.longitude)}
                data-ocid="admin_locations.form.longitude_input"
              />
              {errors.longitude ? (
                <p
                  className="text-xs text-destructive"
                  data-ocid="admin_locations.form.longitude_error"
                >
                  {errors.longitude}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            data-ocid="admin_locations.form.use_current_location_button"
            className="w-fit rounded-lg"
          >
            {locating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Crosshair className="size-4" aria-hidden="true" />
            )}
            {locating ? "Mengambil lokasi…" : "Gunakan lokasi saya saat ini"}
          </Button>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location-radius">Radius (meter)</Label>
            <Input
              id="location-radius"
              inputMode="numeric"
              value={radius}
              onChange={(event) => setRadius(event.target.value)}
              placeholder="100"
              autoComplete="off"
              aria-invalid={Boolean(errors.radiusMeters)}
              data-ocid="admin_locations.form.radius_input"
            />
            {errors.radiusMeters ? (
              <p
                className="text-xs text-destructive"
                data-ocid="admin_locations.form.radius_error"
              >
                {errors.radiusMeters}
              </p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden="true" />
                Karyawan harus berada dalam radius ini untuk dapat absen.
              </p>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              data-ocid="admin_locations.form.cancel_button"
              className="rounded-lg"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-ocid="admin_locations.form.submit_button"
              className="rounded-lg shadow-card"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {isEditing ? "Simpan Perubahan" : "Tambah Lokasi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
