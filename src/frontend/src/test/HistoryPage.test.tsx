import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HistoryPage from "@/pages/HistoryPage";
import {
  type MockActor,
  attendanceView,
  createMockActor,
  fakeSelfie,
  workLocation,
} from "./fixtures";
import { renderWithQuery } from "./render";

const mockActor: { current: MockActor } = { current: createMockActor() };

vi.mock("@/hooks/useBackend", () => ({
  useBackend: () => ({
    actor: mockActor.current,
    isFetching: false,
    isReady: true,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
}));

beforeEach(() => {
  mockActor.current = createMockActor();
});

afterEach(cleanup);

describe("HistoryPage", () => {
  it("shows an empty state when the employee has no attendance records", async () => {
    renderWithQuery(<HistoryPage />);
    expect(
      await screen.findByTestId("history.empty_state"),
    ).toBeInTheDocument();
  });

  it("lists a personal record with date, clock-in/out, and location", async () => {
    mockActor.current.getMyAttendance.mockResolvedValue([
      attendanceView({
        clockOut: 1_700_000_036_000_000_000n,
        clockOutPosition: {
          latitude: -6.2,
          longitude: 106.816666,
          accuracyMeters: 5,
        },
        clockOutSelfie: fakeSelfie(),
      }),
    ]);
    mockActor.current.listWorkLocations.mockResolvedValue([workLocation()]);
    renderWithQuery(<HistoryPage />);
    const row = await screen.findByTestId("history.item.1");
    expect(row).toHaveTextContent("Kantor Pusat");
    // Both clock-in and clock-out times are rendered.
    expect(row).toHaveTextContent("Selesai");
  });

  it("expands a record to reveal the selfie and GPS detail", async () => {
    mockActor.current.getMyAttendance.mockResolvedValue([attendanceView()]);
    mockActor.current.listWorkLocations.mockResolvedValue([workLocation()]);
    renderWithQuery(<HistoryPage />);
    await screen.findByTestId("history.item.1");
    await userEvent.click(screen.getByTestId("history.expand_button.1"));
    const detail = await screen.findByTestId("history.detail.1");
    expect(detail).toHaveTextContent("Koordinat masuk");
    expect(detail).toHaveTextContent("Belum absen keluar");
    expect(screen.getByAltText(/Selfie absen masuk/)).toBeInTheDocument();
  });

  it("shows an error state with a retry action when history fails to load", async () => {
    mockActor.current.getMyAttendance.mockRejectedValue(new Error("boom"));
    renderWithQuery(<HistoryPage />);
    expect(
      await screen.findByTestId("history.error_state"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("history.retry_button")).toBeInTheDocument();
  });
});
