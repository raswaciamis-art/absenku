import Storage "mo:caffeineai-object-storage/Storage";
import Common "common";

module {
  public type UserId = Common.UserId;
  public type Timestamp = Common.Timestamp;
  public type DayKey = Common.DayKey;
  public type Latitude = Common.Latitude;
  public type Longitude = Common.Longitude;
  public type RadiusMeters = Common.RadiusMeters;

  /// A work location managed by an admin.
  public type WorkLocation = {
    id : Nat;
    name : Text;
    latitude : Latitude;
    longitude : Longitude;
    radiusMeters : RadiusMeters;
  };

  /// Coordinates captured from the browser Geolocation API at clock-in/out.
  public type GpsPosition = {
    latitude : Latitude;
    longitude : Longitude;
    accuracyMeters : Float;
  };

  /// A single employee attendance record for one calendar day.
  public type AttendanceRecord = {
    id : Nat;
    user : UserId;
    day : DayKey;
    clockIn : Timestamp;
    clockOut : ?Timestamp;
    clockInPosition : GpsPosition;
    clockOutPosition : ?GpsPosition;
    clockInSelfie : Storage.ExternalBlob;
    clockOutSelfie : ?Storage.ExternalBlob;
    locationId : Nat;
  };

  /// Shared (serializable) view of an attendance record for the API boundary.
  public type AttendanceView = {
    id : Nat;
    user : UserId;
    day : DayKey;
    clockIn : Timestamp;
    clockOut : ?Timestamp;
    clockInPosition : GpsPosition;
    clockOutPosition : ?GpsPosition;
    clockInSelfie : Storage.ExternalBlob;
    clockOutSelfie : ?Storage.ExternalBlob;
    locationId : Nat;
  };

  /// Today's attendance status for the signed-in employee.
  public type TodayStatus = {
    #notClockedIn;
    #clockedIn : { clockIn : Timestamp };
    #clockedOut : { clockIn : Timestamp; clockOut : Timestamp };
  };

  /// Errors returned by attendance mutations.
  public type AttendanceError = {
    #notRegistered;
    #noLocationConfigured;
    #outsideRadius : { distanceMeters : Float; radiusMeters : RadiusMeters };
    #alreadyClockedIn;
    #notClockedIn;
    #alreadyClockedOut;
    #invalidCoordinates;
  };

  /// Errors returned by work-location administration.
  public type LocationError = {
    #notAdmin;
    #notFound : Nat;
    #invalidLocation;
  };
};
