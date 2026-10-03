import List "mo:core/List";
import AccessControl "mo:caffeineai-authorization/access-control";

module {
  public type OldActor = {};

  type WorkLocation = {
    id : Nat;
    name : Text;
    latitude : Float;
    longitude : Float;
    radiusMeters : Nat;
  };

  type GpsPosition = {
    latitude : Float;
    longitude : Float;
    accuracyMeters : Float;
  };

  type AttendanceRecord = {
    id : Nat;
    user : Principal;
    day : Text;
    clockIn : Int;
    clockOut : ?Int;
    clockInPosition : GpsPosition;
    clockOutPosition : ?GpsPosition;
    clockInSelfie : Blob;
    clockOutSelfie : ?Blob;
    locationId : Nat;
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    workLocations : List.List<WorkLocation>;
    attendanceRecords : List.List<AttendanceRecord>;
    counters : { var nextLocationId : Nat; var nextAttendanceId : Nat };
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      workLocations = List.empty();
      attendanceRecords = List.empty();
      counters = { var nextLocationId = 0; var nextAttendanceId = 0 };
    };
  };
};
