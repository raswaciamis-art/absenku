import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useDisplayName } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import {
  Check,
  Fingerprint,
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function shortPrincipal(principal: string): string {
  if (principal.length <= 18) return principal;
  return `${principal.slice(0, 10)}…${principal.slice(-6)}`;
}

function LoginPrompt() {
  const { login, isInitializing, isLoggingIn, isLoginError, loginError } =
    useAuth();
  const disabled = isInitializing || isLoggingIn;

  return (
    <section data-ocid="profile.page" className="animate-fade-in">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Profil Saya
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Masuk untuk melihat profil dan mengatur nama tampilan Anda.
        </p>
      </header>

      <Card
        data-ocid="profile.login.panel"
        className="mx-auto max-w-md rounded-2xl border-border shadow-card"
      >
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-card">
            <UserRound className="size-7" aria-hidden="true" />
          </span>
          <CardTitle className="font-display text-xl">Belum masuk</CardTitle>
          <CardDescription>
            Gunakan Internet Identity untuk mengakses profil kehadiran Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            type="button"
            size="lg"
            onClick={() => login()}
            disabled={disabled}
            data-ocid="profile.login_button"
            className="h-12 w-full rounded-xl text-base shadow-card"
          >
            {disabled ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isInitializing ? "Menyiapkan…" : "Menghubungkan…"}
              </>
            ) : (
              "Masuk dengan Internet Identity"
            )}
          </Button>
          {isLoginError ? (
            <p
              role="alert"
              data-ocid="profile.login.error_state"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              Gagal masuk: {loginError?.message ?? "Terjadi kesalahan."}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export default function ProfilePage() {
  const { isAuthenticated, principal, isAdmin, isRoleLoading, logout } =
    useAuth();
  const { name, saveName, hasName } = useDisplayName();

  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(name ?? "");
  }, [name]);

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  const principalText = principal?.toString() ?? "";
  const displayName = name ?? "Karyawan";
  const initials = initialsOf(displayName);
  const roleLabel = isAdmin ? "Admin" : "Karyawan";
  const isDirty = draft.trim().length > 0 && draft.trim() !== (name ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft.trim();
    if (next.length === 0) return;
    saveName(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 4000);
  }

  return (
    <section data-ocid="profile.page" className="animate-fade-in">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Profil Saya
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola identitas dan nama tampilan Anda di AbsenKu.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card
          data-ocid="profile.identity.card"
          className="rounded-2xl border-border shadow-card"
        >
          <CardHeader>
            <CardTitle className="font-display text-lg">Identitas</CardTitle>
            <CardDescription>
              Akun yang terhubung dengan sesi Internet Identity Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary font-display text-xl font-bold text-primary-foreground shadow-card">
                {initials || (
                  <UserRound className="size-7" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-foreground">
                  {displayName}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {isRoleLoading ? (
                    <Badge
                      variant="secondary"
                      data-ocid="profile.role.loading_state"
                      className="gap-1.5"
                    >
                      <Loader2
                        className="size-3 animate-spin"
                        aria-hidden="true"
                      />
                      Memuat peran…
                    </Badge>
                  ) : (
                    <Badge
                      variant={isAdmin ? "default" : "secondary"}
                      data-ocid="profile.role.badge"
                      className={cn(
                        "gap-1.5",
                        isAdmin && "bg-primary text-primary-foreground",
                      )}
                    >
                      <ShieldCheck className="size-3" aria-hidden="true" />
                      {roleLabel}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Fingerprint className="size-3.5" aria-hidden="true" />
                Principal
              </div>
              <p
                data-ocid="profile.principal.text"
                className="mt-2 break-all font-mono text-sm text-foreground"
                title={principalText}
              >
                {principalText ? shortPrincipal(principalText) : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Peran akun: {roleLabel}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={logout}
              data-ocid="profile.logout_button"
              className="w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Keluar dari akun
            </Button>
          </CardContent>
        </Card>

        <Card
          data-ocid="profile.display_name.card"
          className="rounded-2xl border-border shadow-card"
        >
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Nama Tampilan
            </CardTitle>
            <CardDescription>
              Nama ini muncul di header dan riwayat absensi Anda. Tersimpan
              lokal di perangkat ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="display-name">Nama tampilan</Label>
                <Input
                  id="display-name"
                  name="displayName"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  autoComplete="name"
                  maxLength={60}
                  data-ocid="profile.display_name.input"
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  {hasName
                    ? "Perbarui nama kapan saja — perubahan langsung tersimpan."
                    : "Belum ada nama tersimpan. Isi untuk mempersonalisasi tampilan."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={draft.trim().length === 0 || !isDirty}
                  data-ocid="profile.display_name.save_button"
                  className="rounded-xl shadow-card"
                >
                  Simpan nama
                </Button>
                {saved ? (
                  <span
                    data-ocid="profile.display_name.success_state"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-success"
                  >
                    <Check className="size-4" aria-hidden="true" />
                    Nama tersimpan
                  </span>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
