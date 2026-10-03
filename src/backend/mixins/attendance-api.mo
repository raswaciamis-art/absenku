import List "mo:core/List";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Storage "mo:caffeineai-object-storage/Storage";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/attendance";
import Common "../types/common";
import AttendanceLib "../lib/attendance";

mixin (
  accessControlState : AccessControl.AccessControlState,
  locations : List.List<Types.WorkLocation>,
  records : List.List<Types.AttendanceRecord>,
  counters : AttendanceLib.Counters,
) {
  func isRegistered(caller : Principal) : Bool {
    switch (accessControlState.userRoles.get(caller)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  func validCoordinates(position : Types.GpsPosition) : Bool {
    position.latitude >= -90.0 and position.latitude <= 90.0
      and position.longitude >= -180.0 and position.longitude <= 180.0;
  };

  /// True only when the caller is registered and holds the admin role.
  /// Unregistered and anonymous callers get `false` instead of a trap.
  func isAdminCaller(caller : Principal) : Bool {
    isRegistered(caller) and AccessControl.isAdmin(accessControlState, caller);
  };

  /// Returns the containing location, or the error to report when the
  /// position is not inside any configured work location.
  func resolveLocation(
    position : Types.GpsPosition,
  ) : Result.Result<Types.WorkLocation, Types.AttendanceError> {
    switch (AttendanceLib.findContainingLocation(locations, position)) {
      case (?location) { #ok(location) };
      case (null) {
        if (locations.size() == 0) { return #err(#noLocationConfigured) };
        switch (AttendanceLib.nearestLocation(locations, position)) {
          case (?(nearest, distance)) {
            #err(#outsideRadius({ distanceMeters = distance; radiusMeters = nearest.radiusMeters }));
          };
          case (null) { #err(#noLocationConfigured) };
        };
      };
    };
  };

  // --- Employee attendance ---

  public query ({ caller }) func getTodayStatus() : async Types.TodayStatus {
    let day = AttendanceLib.dayKeyOf(Time.now());
    AttendanceLib.todayStatus(records, caller, day);
  };

  public shared ({ caller }) func clockIn(
    position : Types.GpsPosition,
    selfie : Storage.ExternalBlob,
  ) : async Result.Result<Types.AttendanceView, Types.AttendanceError> {
    if (not isRegistered(caller)) { return #err(#notRegistered) };
    if (not validCoordinates(position)) { return #err(#invalidCoordinates) };
    let day = AttendanceLib.dayKeyOf(Time.now());
    switch (AttendanceLib.findTodayRecord(records, caller, day)) {
      case (?record) {
        switch (record.clockOut) {
          case (null) { return #err(#alreadyClockedIn) };
          case (?_) { return #err(#alreadyClockedOut) };
        };
      };
      case (null) {};
    };
    let location = switch (resolveLocation(position)) {
      case (#err(error)) { return #err(error) };
      case (#ok(location)) { location };
    };
    let record = AttendanceLib.clockIn(
      records,
      counters,
      caller,
      day,
      Time.now(),
      position,
      selfie,
      location.id,
    );
    #ok(AttendanceLib.toView(record));
  };

  public shared ({ caller }) func clockOut(
    position : Types.GpsPosition,
    selfie : Storage.ExternalBlob,
  ) : async Result.Result<Types.AttendanceView, Types.AttendanceError> {
    if (not isRegistered(caller)) { return #err(#notRegistered) };
    if (not validCoordinates(position)) { return #err(#invalidCoordinates) };
    let day = AttendanceLib.dayKeyOf(Time.now());
    switch (AttendanceLib.findTodayRecord(records, caller, day)) {
      case (null) { return #err(#notClockedIn) };
      case (?record) {
        switch (record.clockOut) {
          case (?_) { return #err(#alreadyClockedOut) };
          case (null) {};
        };
      };
    };
    switch (resolveLocation(position)) {
      case (#err(error)) { return #err(error) };
      case (#ok(_)) {};
    };
    switch (AttendanceLib.clockOut(records, caller, day, Time.now(), position, selfie)) {
      case (null) { #err(#notClockedIn) };
      case (?record) { #ok(AttendanceLib.toView(record)) };
    };
  };

  public query ({ caller }) func getMyAttendance() : async [Types.AttendanceView] {
    AttendanceLib.listForUser(records, caller);
  };

  // --- Admin work-location management ---

  public query ({ caller }) func listWorkLocations() : async [Types.WorkLocation] {
    AttendanceLib.listLocations(locations);
  };

  public shared ({ caller }) func addWorkLocation(
    name : Text,
    latitude : Types.Latitude,
    longitude : Types.Longitude,
    radiusMeters : Types.RadiusMeters,
  ) : async Result.Result<Types.WorkLocation, Types.LocationError> {
    if (not isAdminCaller(caller)) {
      return #err(#notAdmin);
    };
    if (name == "" or radiusMeters == 0) { return #err(#invalidLocation) };
    #ok(AttendanceLib.addLocation(locations, counters, name, latitude, longitude, radiusMeters));
  };

  public shared ({ caller }) func updateWorkLocation(
    id : Nat,
    name : Text,
    latitude : Types.Latitude,
    longitude : Types.Longitude,
    radiusMeters : Types.RadiusMeters,
  ) : async Result.Result<Types.WorkLocation, Types.LocationError> {
    if (not isAdminCaller(caller)) {
      return #err(#notAdmin);
    };
    if (name == "" or radiusMeters == 0) { return #err(#invalidLocation) };
    if (not AttendanceLib.updateLocation(locations, id, name, latitude, longitude, radiusMeters)) {
      return #err(#notFound(id));
    };
    #ok({ id; name; latitude; longitude; radiusMeters });
  };

  public shared ({ caller }) func deleteWorkLocation(
    id : Nat,
  ) : async Result.Result<(), Types.LocationError> {
    if (not isAdminCaller(caller)) {
      return #err(#notAdmin);
    };
    if (not AttendanceLib.deleteLocation(locations, id)) {
      return #err(#notFound(id));
    };
    #ok(());
  };

  // --- Admin recap ---

  public query ({ caller }) func getAttendanceRecap(
    day : ?Common.DayKey,
    user : ?Common.UserId,
  ) : async Result.Result<[Types.AttendanceView], Types.LocationError> {
    if (not isAdminCaller(caller)) {
      return #err(#notAdmin);
    };
    #ok(AttendanceLib.listFiltered(records, day, user));
  };
};
