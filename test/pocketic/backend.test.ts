import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";
// Set only on a converted project: the last pre-EM revision, whose schema this
// app's migration chain replays from. Installing the current wasm onto an empty
// canister there traps IC0503 before any test runs.
const BASELINE_WASM = process.env.BACKEND_WASM_BASELINE;

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

const admin = createIdentity("absenku-admin");
const employee = createIdentity("absenku-employee");
const outsider = createIdentity("absenku-outsider");
const daily = createIdentity("absenku-daily");

/** A GPS position inside the seeded work location. */
const INSIDE = { latitude: -6.2, longitude: 106.816666, accuracyMeters: 5 };
/** A GPS position far outside the seeded work location. */
const OUTSIDE = { latitude: -6.9, longitude: 107.6, accuracyMeters: 5 };

/** A minimal non-empty selfie blob reference. */
const SELFIE = new Uint8Array([1, 2, 3, 4]);

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  if (BASELINE_WASM === undefined) {
    ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: BACKEND_WASM,
    }));
  } else {
    // `[baseline, current]`, the same install contract the hosted deploy uses
    // for a converted project. The upgrade replays the chain from the legacy
    // schema.
    const installed = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: BASELINE_WASM,
    });
    await pic.upgradeCanister({
      canisterId: installed.canisterId,
      wasm: BACKEND_WASM,
      arg: new Uint8Array(),
    });
    ({ actor, canisterId } = installed);
  }

  // Registration happens only through the app's own sign-in flow. The first
  // caller to `_initialize_access_control` becomes the admin; every later
  // caller is registered as a regular employee. Do this once here so the
  // per-test identities below are all registered before any guarded call.
  actor.setIdentity(admin);
  await actor._initialize_access_control();
  await actor.assignCallerUserRole(employee.getPrincipal(), { user: null });
  await actor.assignCallerUserRole(outsider.getPrincipal(), { user: null });
  await actor.assignCallerUserRole(daily.getPrincipal(), { user: null });
});

afterAll(async () => {
  // `?.` because `beforeAll` may not have got that far. A failed
  // `PocketIc.create` otherwise stacks "Cannot read properties of undefined"
  // on top of the real error and buries the one line that explains the run.
  await pic?.tearDown();
});

it("answers empty-state reads instead of trapping", async () => {
  actor.setIdentity(employee);
  await expect(actor.getTodayStatus()).resolves.toEqual({ notClockedIn: null });
  await expect(actor.getMyAttendance()).resolves.toEqual([]);
  await expect(actor.listWorkLocations()).resolves.toEqual([]);
});

it("rejects an unregistered caller instead of trapping", async () => {
  // A freshly created actor calls as the anonymous principal until an identity
  // is set, and an unregistered caller must receive an error variant.
  const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(guest.clockIn(INSIDE, SELFIE)).resolves.toEqual({
    err: { notRegistered: null },
  });
  await expect(guest.getAttendanceRecap([], [])).resolves.toEqual({
    err: { notAdmin: null },
  });
});

it("lets an admin add a work location and rejects a non-admin", async () => {
  actor.setIdentity(employee);
  await expect(
    actor.addWorkLocation("Kantor Pusat", -6.2, 106.816666, 200n),
  ).resolves.toEqual({ err: { notAdmin: null } });

  actor.setIdentity(admin);
  const added = await actor.addWorkLocation(
    "Kantor Pusat",
    -6.2,
    106.816666,
    200n,
  );
  expect(added).toMatchObject({
    ok: {
      name: "Kantor Pusat",
      latitude: -6.2,
      longitude: 106.816666,
      radiusMeters: 200n,
    },
  });

  await expect(actor.listWorkLocations()).resolves.toHaveLength(1);
});

it("round-trips clock-in and clock-out through the real canister", async () => {
  actor.setIdentity(employee);

  const clockedIn = await actor.clockIn(INSIDE, SELFIE);
  expect(clockedIn).toMatchObject({ ok: { clockIn: expect.any(BigInt) } });
  if ("ok" in clockedIn) {
    expect(clockedIn.ok.clockIn).toBeGreaterThan(0n);
    expect(clockedIn.ok.clockOut).toEqual([]);
    expect(clockedIn.ok.clockInPosition).toMatchObject({
      latitude: INSIDE.latitude,
      longitude: INSIDE.longitude,
    });
  }

  await expect(actor.getTodayStatus()).resolves.toMatchObject({
    clockedIn: expect.anything(),
  });

  const clockedOut = await actor.clockOut(INSIDE, SELFIE);
  // `clockOut` is `opt Timestamp`, which the declarations encode as `[] | [T]`.
  expect(clockedOut).toMatchObject({ ok: { clockOut: [expect.any(BigInt)] } });
  if ("ok" in clockedOut) {
    expect(clockedOut.ok.clockOut[0]).toBeGreaterThan(0n);
    expect(clockedOut.ok.clockOutPosition).toBeDefined();
  }

  await expect(actor.getTodayStatus()).resolves.toMatchObject({
    clockedOut: expect.anything(),
  });

  const history = await actor.getMyAttendance();
  expect(history).toHaveLength(1);
  if ("ok" in clockedIn) {
    expect(history[0]).toMatchObject({ id: clockedIn.ok.id });
  }
});

it("rejects a clock-in outside the configured radius", async () => {
  actor.setIdentity(outsider);
  const result = await actor.clockIn(OUTSIDE, SELFIE);
  expect(result).toMatchObject({ err: { outsideRadius: expect.anything() } });
});

it("enforces one clock-in and one clock-out per day", async () => {
  // A dedicated identity so this test seeds its own state instead of relying on
  // what an earlier test left behind.
  actor.setIdentity(daily);
  await expect(actor.clockIn(INSIDE, SELFIE)).resolves.toMatchObject({
    ok: expect.anything(),
  });
  await expect(actor.clockIn(INSIDE, SELFIE)).resolves.toEqual({
    err: { alreadyClockedIn: null },
  });
  await expect(actor.clockOut(INSIDE, SELFIE)).resolves.toMatchObject({
    ok: expect.anything(),
  });
  await expect(actor.clockOut(INSIDE, SELFIE)).resolves.toEqual({
    err: { alreadyClockedOut: null },
  });
});

it("keeps one caller's attendance out of another's history", async () => {
  actor.setIdentity(outsider);
  await expect(actor.getMyAttendance()).resolves.toEqual([]);
});

it("returns the admin recap only to an admin", async () => {
  actor.setIdentity(employee);
  await expect(actor.getAttendanceRecap([], [])).resolves.toEqual({
    err: { notAdmin: null },
  });

  actor.setIdentity(admin);
  const recap = await actor.getAttendanceRecap([], []);
  expect(recap).toMatchObject({ ok: expect.any(Array) });
  if ("ok" in recap) {
    expect(recap.ok.length).toBeGreaterThanOrEqual(1);
  }
});

it("filters the admin recap by employee principal", async () => {
  actor.setIdentity(admin);
  const filtered = await actor.getAttendanceRecap([], [employee.getPrincipal()]);
  expect(filtered).toMatchObject({ ok: expect.any(Array) });
  if ("ok" in filtered) {
    expect(filtered.ok).toHaveLength(1);
    expect(filtered.ok[0].user.toString()).toBe(employee.getPrincipal().toString());
  }
});
