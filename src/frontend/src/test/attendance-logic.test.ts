import { evaluateGps } from "@/components/attendance/GpsStatusPanel";
import { attendanceErrorMessage, locationErrorMessage } from "@/types";
import { describe, expect, it } from "vitest";
import { gpsPosition, workLocation } from "./fixtures";

describe("evaluateGps", () => {
  it("verifies a position inside the configured radius", () => {
    const result = evaluateGps("granted", gpsPosition(), [workLocation()]);
    expect(result.verdict).toBe("verified");
    expect(result.nearest?.name).toBe("Kantor Pusat");
    expect(result.distanceMeters).toBeLessThan(200);
  });

  it("reports outside when the position exceeds the radius", () => {
    const result = evaluateGps(
      "granted",
      gpsPosition({ latitude: -6.9, longitude: 107.6 }),
      [workLocation()],
    );
    expect(result.verdict).toBe("outside");
    expect(result.distanceMeters).toBeGreaterThan(200);
  });

  it("reports unavailable when no work location is configured", () => {
    const result = evaluateGps("granted", gpsPosition(), []);
    expect(result.verdict).toBe("unavailable");
  });

  it("maps denied and unavailable geolocation statuses", () => {
    expect(evaluateGps("denied", null, [workLocation()]).verdict).toBe(
      "denied",
    );
    expect(evaluateGps("unavailable", null, [workLocation()]).verdict).toBe(
      "unavailable",
    );
    expect(evaluateGps("idle", null, [workLocation()]).verdict).toBe("idle");
  });

  it("picks the nearest of several locations", () => {
    const near = workLocation({
      id: 2n,
      name: "Cabang Dekat",
      latitude: -6.2001,
    });
    const far = workLocation({ id: 3n, name: "Cabang Jauh", latitude: -6.5 });
    const result = evaluateGps("granted", gpsPosition(), [far, near]);
    expect(result.nearest?.name).toBe("Cabang Dekat");
    expect(result.verdict).toBe("verified");
  });
});

describe("attendanceErrorMessage", () => {
  it("renders a clear Indonesian message for each error kind", () => {
    expect(
      attendanceErrorMessage({ __kind__: "notClockedIn", notClockedIn: null }),
    ).toContain("belum melakukan absen masuk");
    expect(
      attendanceErrorMessage({
        __kind__: "outsideRadius",
        outsideRadius: { distanceMeters: 350, radiusMeters: 200n },
      }),
    ).toContain("350 m");
    expect(
      attendanceErrorMessage({
        __kind__: "alreadyClockedIn",
        alreadyClockedIn: null,
      }),
    ).toContain("sudah melakukan absen masuk");
    expect(
      attendanceErrorMessage({
        __kind__: "notRegistered",
        notRegistered: null,
      }),
    ).toContain("belum terdaftar");
  });
});

describe("locationErrorMessage", () => {
  it("renders a clear Indonesian message for each location error", () => {
    expect(
      locationErrorMessage({ __kind__: "notAdmin", notAdmin: null }),
    ).toContain("Hanya admin");
    expect(
      locationErrorMessage({ __kind__: "notFound", notFound: 7n }),
    ).toContain("tidak ditemukan");
    expect(
      locationErrorMessage({
        __kind__: "invalidLocation",
        invalidLocation: null,
      }),
    ).toContain("tidak valid");
  });
});
