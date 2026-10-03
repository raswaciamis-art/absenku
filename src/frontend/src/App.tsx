import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { router } from "@/router";
import { RouterProvider } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

function LoginScreen() {
  const { login, isInitializing, isLoggingIn, isLoginError, loginError } =
    useAuth();
  const disabled = isInitializing || isLoggingIn;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-subtle px-4 py-12">
      <div className="w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-card">
            <span className="font-display text-2xl font-bold">A</span>
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            AbsenKu
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Presensi kehadiran dengan verifikasi GPS dan selfie. Masuk untuk
            mencatat jam masuk dan jam keluar Anda.
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={() => login()}
          disabled={disabled}
          data-ocid="auth.login_button"
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
            data-ocid="auth.error_state"
            className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            Gagal masuk: {loginError?.message ?? "Terjadi kesalahan."}
          </p>
        ) : null}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Data kehadiran Anda tersimpan aman di Internet Computer.
        </p>
      </div>
    </div>
  );
}

function SessionExpiredScreen() {
  const { login, isLoggingIn } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-subtle px-4 py-12">
      <div className="w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Sesi berakhir
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sesi Anda telah berakhir karena tidak ada aktivitas. Masuk kembali
          untuk melanjutkan absensi.
        </p>
        <Button
          type="button"
          size="lg"
          onClick={() => login()}
          disabled={isLoggingIn}
          data-ocid="auth.reauth_button"
          className="mt-6 h-12 w-full rounded-xl text-base shadow-card"
        >
          {isLoggingIn ? "Menghubungkan…" : "Masuk kembali"}
        </Button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      data-ocid="app.loading_state"
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <span className="text-sm">Memuat AbsenKu…</span>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isInitializing, isSessionExpired } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <>
        {isSessionExpired ? <SessionExpiredScreen /> : <LoginScreen />}
        <Toaster position="top-center" richColors />
      </>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </>
  );
}
