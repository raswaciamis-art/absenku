import type {
  AttendanceView,
  GpsPosition,
  TodayStatus,
  UserRole,
  WorkLocation,
} from "@/types";
import { UserRole as Role } from "@/types";
import type { ExternalBlob } from "@caffeineai/object-storage";
import { vi } from "vitest";

/** A typed local stand-in for the generated backend actor. */
export interface MockActor {
  getTodayStatus: ReturnType<typeof vi.fn>;
  clockIn: ReturnType<typeof vi.fn>;
  clockOut: ReturnType<typeof vi.fn>;
  getMyAttendance: ReturnType<typeof vi.fn>;
  listWorkLocations: ReturnType<typeof vi.fn>;
  addWorkLocation: ReturnType<typeof vi.fn>;
  updateWorkLocation: ReturnType<typeof vi.fn>;
  deleteWorkLocation: ReturnType<typeof vi.fn>;
  getAttendanceRecap: ReturnType<typeof vi.fn>;
  getCallerUserRole: ReturnType<typeof vi.fn>;
}

export function createMockActor(overrides: Partial<MockActor> = {}): MockActor {
  return {
    getTodayStatus: vi.fn(
      async (): Promise<TodayStatus> => ({
        __kind__: "notClockedIn",
        notClockedIn: null,
      }),
    ),
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    getMyAttendance: vi.fn(async (): Promise<AttendanceView[]> => []),
    listWorkLocations: vi.fn(async (): Promise<WorkLocation[]> => []),
    addWorkLocation: vi.fn(),
    updateWorkLocation: vi.fn(),
    deleteWorkLocation: vi.fn(),
    getAttendanceRecap: vi.fn(async () => ({ __kind__: "ok", ok: [] })),
    getCallerUserRole: vi.fn(async (): Promise<UserRole> => Role.user),
    ...overrides,
  };
}

/** A work location fixture. */
export function workLocation(
  overrides: Partial<WorkLocation> = {},
): WorkLocation {
  return {
    id: 1n,
    name: "Kantor Pusat",
    latitude: -6.2,
    longitude: 106.816666,
    radiusMeters: 200n,
    ...overrides,
  };
}

/** A GPS position fixture. */
export function gpsPosition(overrides: Partial<GpsPosition> = {}): GpsPosition {
  return {
    latitude: -6.2,
    longitude: 106.816666,
    accuracyMeters: 5,
    ...overrides,
  };
}

/** A minimal ExternalBlob-like object for selfie arguments. */
export function fakeSelfie(): ExternalBlob {
  return {
    getDirectURL: () => "https://example.test/selfie.jpg",
  } as unknown as ExternalBlob;
}

/** An attendance record fixture. */
export function attendanceView(
  overrides: Partial<AttendanceView> = {},
): AttendanceView {
  return {
    id: 1n,
    day: "2026-10-03",
    user: { toString: () => "aaaaa-aa" } as unknown as AttendanceView["user"],
    clockIn: 1_700_000_000_000_000_000n,
    clockInPosition: gpsPosition(),
    clockInSelfie: fakeSelfie(),
    locationId: 1n,
    ...overrides,
  };
}
