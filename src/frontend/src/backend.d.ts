import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export type AttendanceError = {
    __kind__: "notClockedIn";
    notClockedIn: null;
} | {
    __kind__: "noLocationConfigured";
    noLocationConfigured: null;
} | {
    __kind__: "alreadyClockedOut";
    alreadyClockedOut: null;
} | {
    __kind__: "outsideRadius";
    outsideRadius: {
        radiusMeters: RadiusMeters;
        distanceMeters: number;
    };
} | {
    __kind__: "invalidCoordinates";
    invalidCoordinates: null;
} | {
    __kind__: "alreadyClockedIn";
    alreadyClockedIn: null;
} | {
    __kind__: "notRegistered";
    notRegistered: null;
};
export interface AttendanceView {
    id: bigint;
    day: DayKey;
    clockOutSelfie?: ExternalBlob;
    user: UserId;
    clockOut?: Timestamp;
    clockInPosition: GpsPosition;
    clockIn: Timestamp;
    locationId: bigint;
    clockOutPosition?: GpsPosition;
    clockInSelfie: ExternalBlob;
}
export interface Cell {
    value: Value;
    name: string;
}
export type DayKey = string;
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface GpsPosition {
    latitude: Latitude;
    longitude: Longitude;
    accuracyMeters: number;
}
export type Latitude = number;
export type LocationError = {
    __kind__: "invalidLocation";
    invalidLocation: null;
} | {
    __kind__: "notFound";
    notFound: bigint;
} | {
    __kind__: "notAdmin";
    notAdmin: null;
};
export type Longitude = number;
export type RadiusMeters = bigint;
export type Result = {
    __kind__: "ok";
    ok: WorkLocation;
} | {
    __kind__: "err";
    err: LocationError;
};
export type Result_1 = {
    __kind__: "ok";
    ok: Array<AttendanceView>;
} | {
    __kind__: "err";
    err: LocationError;
};
export type Result_2 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: LocationError;
};
export type Result_3 = {
    __kind__: "ok";
    ok: AttendanceView;
} | {
    __kind__: "err";
    err: AttendanceError;
};
export type Result_4 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface Result__1 {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Timestamp = bigint;
export type TodayStatus = {
    __kind__: "notClockedIn";
    notClockedIn: null;
} | {
    __kind__: "clockedIn";
    clockedIn: {
        clockIn: Timestamp;
    };
} | {
    __kind__: "clockedOut";
    clockedOut: {
        clockOut: Timestamp;
        clockIn: Timestamp;
    };
};
export type UserId = Principal;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface WorkLocation {
    id: bigint;
    latitude: Latitude;
    name: string;
    longitude: Longitude;
    radiusMeters: RadiusMeters;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addWorkLocation(name: string, latitude: Latitude, longitude: Longitude, radiusMeters: RadiusMeters): Promise<Result>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clockIn(position: GpsPosition, selfie: ExternalBlob): Promise<Result_3>;
    clockOut(position: GpsPosition, selfie: ExternalBlob): Promise<Result_3>;
    deleteWorkLocation(id: bigint): Promise<Result_2>;
    execute(qJson: string): Promise<Result__1>;
    /**
     * / Static Markdown documentation of the public backend API.
     */
    getApiDoc(): Promise<string>;
    getAttendanceRecap(day: DayKey | null, user: UserId | null): Promise<Result_1>;
    getCallerUserRole(): Promise<UserRole>;
    getMyAttendance(): Promise<Array<AttendanceView>>;
    getTodayStatus(): Promise<TodayStatus>;
    isCallerAdmin(): Promise<boolean>;
    listWorkLocations(): Promise<Array<WorkLocation>>;
    schema(): Promise<string>;
    updateWorkLocation(id: bigint, name: string, latitude: Latitude, longitude: Longitude, radiusMeters: RadiusMeters): Promise<Result>;
}
