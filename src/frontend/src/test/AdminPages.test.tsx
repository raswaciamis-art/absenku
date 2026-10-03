import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminLocationsPage from "@/pages/AdminLocationsPage";
import AdminRecapPage from "@/pages/AdminRecapPage";
import { type MockActor, createMockActor, workLocation } from "./fixtures";
import { renderWithQuery } from "./render";

const mockActor: { current: MockActor } = { current: createMockActor() };
const authState = { isAdmin: false, isRoleLoading: false };

vi.mock("@/hooks/useBackend", () => ({
  useBackend: () => ({
    actor: mockActor.current,
    isFetching: false,
    isReady: true,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    identity: null,
    principal: null,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
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

beforeEach(() => {
  mockActor.current = createMockActor();
  authState.isAdmin = false;
  authState.isRoleLoading = false;
});

afterEach(cleanup);

describe("admin route protection", () => {
  it("blocks a non-admin from the attendance recap page", async () => {
    renderWithQuery(<AdminRecapPage />);
    expect(
      await screen.findByTestId("admin_recap.access_denied_state"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("admin_recap.table")).not.toBeInTheDocument();
  });

  it("blocks a non-admin from the work-location management page", async () => {
    renderWithQuery(<AdminLocationsPage />);
    expect(
      await screen.findByTestId("admin_locations.access_denied_state"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("admin_locations.add_button"),
    ).not.toBeInTheDocument();
  });

  it("lets an admin see the recap table with employee records", async () => {
    authState.isAdmin = true;
    mockActor.current.getAttendanceRecap.mockResolvedValue({
      __kind__: "ok",
      ok: [
        {
          id: 1n,
          day: "2026-10-03",
          user: { toString: () => "aaaaa-aa" },
          clockIn: 1_700_000_000_000_000_000n,
          clockInPosition: {
            latitude: -6.2,
            longitude: 106.816666,
            accuracyMeters: 5,
          },
          clockInSelfie: {
            getDirectURL: () => "https://example.test/selfie.jpg",
          },
          locationId: 1n,
        },
      ],
    });
    mockActor.current.listWorkLocations.mockResolvedValue([workLocation()]);
    renderWithQuery(<AdminRecapPage />);
    expect(await screen.findByTestId("admin_recap.table")).toBeInTheDocument();
    expect(screen.getByTestId("admin_recap.row.1")).toBeInTheDocument();
  });

  it("lets an admin open the add-location dialog and submit a new location", async () => {
    authState.isAdmin = true;
    mockActor.current.listWorkLocations.mockResolvedValue([]);
    mockActor.current.addWorkLocation.mockResolvedValue({
      __kind__: "ok",
      ok: workLocation(),
    });
    renderWithQuery(<AdminLocationsPage />);
    await screen.findByTestId("admin_locations.empty_state");
    await userEvent.click(
      screen.getByTestId("admin_locations.empty_add_button"),
    );
    await userEvent.type(
      await screen.findByTestId("admin_locations.form.name_input"),
      "Kantor Cabang",
    );
    await userEvent.type(
      screen.getByTestId("admin_locations.form.latitude_input"),
      "-6.2",
    );
    await userEvent.type(
      screen.getByTestId("admin_locations.form.longitude_input"),
      "106.816666",
    );
    await userEvent.click(
      screen.getByTestId("admin_locations.form.submit_button"),
    );
    await waitFor(() =>
      expect(mockActor.current.addWorkLocation).toHaveBeenCalledTimes(1),
    );
    const [name, latitude, longitude, radiusMeters] =
      mockActor.current.addWorkLocation.mock.calls[0];
    expect(name).toBe("Kantor Cabang");
    expect(latitude).toBeCloseTo(-6.2);
    expect(longitude).toBeCloseTo(106.816666);
    expect(radiusMeters).toBe(100n);
  });
});
