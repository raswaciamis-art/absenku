import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AttendancePage from "@/pages/AttendancePage";
import type { GpsPosition, WorkLocation } from "@/types";
import {
  type MockActor,
  createMockActor,
  gpsPosition,
  workLocation,
} from "./fixtures";
import { renderWithQuery } from "./render";

const mockActor: { current: MockActor } = { current: createMockActor() };

// --- Seam mocks -----------------------------------------------------------
// The page composes four hooks. We mock the seams so each test can drive the
// exact GPS / selfie / auth state it needs without a real browser or camera.

vi.mock("@/hooks/useBackend", () => ({
  useBackend: () => ({
    actor: mockActor.current,
    isFetching: false,
    isReady: true,
  }),
}));

const authState = {
  isAdmin: false,
  isAuthenticated: true,
  isRoleLoading: false,
};
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    identity: null,
    principal: null,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: authState.isAuthenticated,
    isInitializing: false,
    isLoggingIn: false,
    isLoginError: false,
    isSessionExpired: false,
    loginError: null,
    role: authState.isAdmin ? "admin" : "user",
    isAdmin: authState.isAdmin,
    isRoleLoading: authState.isRoleLoading,
    refetchRole: vi.fn(),
  }),
}));

const geoState: {
  position: GpsPosition | null;
  status:
    | "idle"
    | "requesting"
    | "granted"
    | "denied"
    | "unavailable"
    | "error";
  message: string | null;
  requestPosition: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
} = {
  position: null,
  status: "idle",
  message: null,
  requestPosition: vi.fn(),
  reset: vi.fn(),
};
vi.mock("@/hooks/useGeolocation", () => ({
  useGeolocation: () => ({
    position: geoState.position,
    status: geoState.status,
    message: geoState.message,
    isLoading: geoState.status === "requesting",
    requestPosition: geoState.requestPosition,
    reset: geoState.reset,
  }),
}));

const selfieState: {
  selfie: File | null;
  previewUrl: string | null;
  isActive: boolean;
  isSupported: boolean | null;
  isLoading: boolean;
  error: string | null;
  capture: ReturnType<typeof vi.fn>;
  retake: ReturnType<typeof vi.fn>;
  startCamera: ReturnType<typeof vi.fn>;
  stopCamera: ReturnType<typeof vi.fn>;
} = {
  selfie: null,
  previewUrl: null,
  isActive: true,
  isSupported: true,
  isLoading: false,
  error: null,
  capture: vi.fn(),
  retake: vi.fn(),
  startCamera: vi.fn(),
  stopCamera: vi.fn(),
};
vi.mock("@/hooks/useSelfieCapture", () => ({
  useSelfieCapture: () => ({
    videoRef: { current: null },
    canvasRef: { current: null },
    isActive: selfieState.isActive,
    isSupported: selfieState.isSupported,
    isLoading: selfieState.isLoading,
    error: selfieState.error,
    selfie: selfieState.selfie,
    previewUrl: selfieState.previewUrl,
    startCamera: selfieState.startCamera,
    stopCamera: selfieState.stopCamera,
    capture: selfieState.capture,
    retake: selfieState.retake,
  }),
  selfieToExternalBlob: vi.fn(async () => ({
    getDirectURL: () => "https://example.test/selfie.jpg",
  })),
}));

function resetSeams() {
  mockActor.current = createMockActor();
  authState.isAdmin = false;
  authState.isAuthenticated = true;
  authState.isRoleLoading = false;
  geoState.position = null;
  geoState.status = "idle";
  geoState.message = null;
  geoState.requestPosition = vi.fn(async () => null);
  geoState.reset = vi.fn();
  selfieState.selfie = null;
  selfieState.previewUrl = null;
  selfieState.isActive = true;
  selfieState.isSupported = true;
  selfieState.isLoading = false;
  selfieState.error = null;
  selfieState.capture = vi.fn();
  selfieState.retake = vi.fn();
}

/** Put the page in the state where GPS is verified and a selfie is captured. */
function armReadyToClockIn(locations: WorkLocation[] = [workLocation()]) {
  mockActor.current.listWorkLocations.mockResolvedValue(locations);
  geoState.position = gpsPosition();
  geoState.status = "granted";
  selfieState.selfie = new File(["selfie"], "selfie.jpg", {
    type: "image/jpeg",
  });
  selfieState.previewUrl = "blob:preview";
}

beforeEach(resetSeams);
afterEach(cleanup);

describe("AttendancePage", () => {
  it("shows the not-clocked-in status and disables both actions initially", async () => {
    renderWithQuery(<AttendancePage />);
    expect(await screen.findByText("Belum Absen")).toBeInTheDocument();
    expect(screen.getByTestId("attendance.clock_in_button")).toBeDisabled();
    expect(screen.getByTestId("attendance.clock_out_button")).toBeDisabled();
  });

  it("shows the clocked-in status with the recorded clock-in time", async () => {
    mockActor.current.getTodayStatus.mockResolvedValue({
      __kind__: "clockedIn",
      clockedIn: { clockIn: 1_700_000_000_000_000_000n },
    });
    renderWithQuery(<AttendancePage />);
    expect(await screen.findByText("Sudah Masuk")).toBeInTheDocument();
    expect(screen.getByTestId("attendance.clock_in_button")).toBeDisabled();
  });

  it("shows the completed state when both clock-in and clock-out are recorded", async () => {
    mockActor.current.getTodayStatus.mockResolvedValue({
      __kind__: "clockedOut",
      clockedOut: {
        clockIn: 1_700_000_000_000_000_000n,
        clockOut: 1_700_000_036_000_000_000n,
      },
    });
    renderWithQuery(<AttendancePage />);
    expect(await screen.findByText("Sudah Keluar")).toBeInTheDocument();
    expect(
      screen.getByTestId("attendance.status.success_state"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("attendance.clock_in_button")).toBeDisabled();
    expect(screen.getByTestId("attendance.clock_out_button")).toBeDisabled();
  });

  it("shows an error state when today's status fails to load", async () => {
    mockActor.current.getTodayStatus.mockRejectedValue(new Error("boom"));
    renderWithQuery(<AttendancePage />);
    expect(
      await screen.findByTestId("attendance.status.error_state"),
    ).toBeInTheDocument();
  });

  it("keeps clock-in disabled until both GPS and selfie are ready", async () => {
    mockActor.current.listWorkLocations.mockResolvedValue([workLocation()]);
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Belum Absen");
    // GPS verified but no selfie yet.
    geoState.position = gpsPosition();
    geoState.status = "granted";
    expect(screen.getByTestId("attendance.clock_in_button")).toBeDisabled();
  });

  it("enables clock-in once GPS is verified and a selfie is captured", async () => {
    armReadyToClockIn();
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Belum Absen");
    await waitFor(() =>
      expect(screen.getByTestId("attendance.clock_in_button")).toBeEnabled(),
    );
    expect(screen.getByTestId("attendance.gps.status")).toHaveTextContent(
      "Lokasi terverifikasi",
    );
  });

  it("records a clock-in and shows the success toast when in radius with a selfie", async () => {
    armReadyToClockIn();
    mockActor.current.clockIn.mockResolvedValue({
      __kind__: "ok",
      ok: { clockIn: 1_700_000_000_000_000_000n },
    });
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Belum Absen");
    const button = screen.getByTestId("attendance.clock_in_button");
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    await waitFor(() =>
      expect(mockActor.current.clockIn).toHaveBeenCalledTimes(1),
    );
    const [position, selfie] = mockActor.current.clockIn.mock.calls[0];
    expect(position).toMatchObject({ latitude: -6.2 });
    expect(selfie).toBeTruthy();
  });

  it("surfaces a clear message when the backend rejects an out-of-radius clock-in", async () => {
    armReadyToClockIn();
    mockActor.current.clockIn.mockResolvedValue({
      __kind__: "err",
      err: {
        __kind__: "outsideRadius",
        outsideRadius: { distanceMeters: 350, radiusMeters: 200n },
      },
    });
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Belum Absen");
    const button = screen.getByTestId("attendance.clock_in_button");
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    const alert = await screen.findByTestId("attendance.action.error_state");
    expect(alert).toHaveTextContent("350 m");
  });

  it("does not call the backend when the selfie is missing", async () => {
    mockActor.current.listWorkLocations.mockResolvedValue([workLocation()]);
    geoState.position = gpsPosition();
    geoState.status = "granted";
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Belum Absen");
    // No selfie => clock-in stays disabled, so the backend is never invoked.
    expect(screen.getByTestId("attendance.clock_in_button")).toBeDisabled();
    expect(mockActor.current.clockIn).not.toHaveBeenCalled();
  });

  it("only enables clock-out after a clock-in is recorded today", async () => {
    mockActor.current.getTodayStatus.mockResolvedValue({
      __kind__: "clockedIn",
      clockedIn: { clockIn: 1_700_000_000_000_000_000n },
    });
    armReadyToClockIn();
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Sudah Masuk");
    await waitFor(() =>
      expect(screen.getByTestId("attendance.clock_out_button")).toBeEnabled(),
    );
    expect(screen.getByTestId("attendance.clock_in_button")).toBeDisabled();
  });

  it("records a clock-out when the employee has already clocked in", async () => {
    mockActor.current.getTodayStatus.mockResolvedValue({
      __kind__: "clockedIn",
      clockedIn: { clockIn: 1_700_000_000_000_000_000n },
    });
    armReadyToClockIn();
    mockActor.current.clockOut.mockResolvedValue({
      __kind__: "ok",
      ok: {
        clockIn: 1_700_000_000_000_000_000n,
        clockOut: 1_700_000_036_000_000_000n,
      },
    });
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Sudah Masuk");
    const button = screen.getByTestId("attendance.clock_out_button");
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    await waitFor(() =>
      expect(mockActor.current.clockOut).toHaveBeenCalledTimes(1),
    );
  });

  it("shows the selfie preview and a retake action after capture", async () => {
    selfieState.selfie = new File(["selfie"], "selfie.jpg", {
      type: "image/jpeg",
    });
    selfieState.previewUrl = "blob:preview";
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Belum Absen");
    expect(screen.getByTestId("attendance.selfie.preview")).toBeInTheDocument();
    await userEvent.click(
      screen.getByTestId("attendance.selfie.retake_button"),
    );
    expect(selfieState.retake).toHaveBeenCalledTimes(1);
  });

  it("shows the GPS denied message and a retry control", async () => {
    geoState.status = "denied";
    geoState.message =
      "Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser untuk melanjutkan absensi.";
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Belum Absen");
    expect(screen.getByTestId("attendance.gps.status")).toHaveTextContent(
      "Izin lokasi ditolak",
    );
    expect(
      screen.getByTestId("attendance.gps.retry_button"),
    ).toBeInTheDocument();
  });

  it("shows the out-of-radius verdict with the distance to the nearest location", async () => {
    mockActor.current.listWorkLocations.mockResolvedValue([workLocation()]);
    geoState.position = gpsPosition({ latitude: -6.9, longitude: 107.6 });
    geoState.status = "granted";
    renderWithQuery(<AttendancePage />);
    await screen.findByText("Belum Absen");
    await waitFor(() =>
      expect(screen.getByTestId("attendance.gps.status")).toHaveTextContent(
        "Di luar radius",
      ),
    );
    expect(
      screen.getByTestId("attendance.gps.retry_button"),
    ).toBeInTheDocument();
  });
});
