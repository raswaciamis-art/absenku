import Float32 "mo:core/Float32";
import Int "mo:core/Int";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Storage "mo:caffeineai-object-storage/Storage";
import Types "../types/attendance";
import Common "../types/common";

module {
  public type UserId = Common.UserId;
  public type Timestamp = Common.Timestamp;
  public type DayKey = Common.DayKey;

  /// Mutable counters shared with the actor.
  public type Counters = { var nextLocationId : Nat; var nextAttendanceId : Nat };

  let secondsPerDay : Int = 86_400;
  let nanosPerSecond : Int = 1_000_000_000;
  let earthRadiusMeters : Float = 6_371_000.0;
  let degreesToRadians : Float = 0.017453292519943295;

  /// Civil date (year, month, day) for a count of days since 1970-01-01.
  func civilFromDays(z : Int) : (Int, Int, Int) {
    let zz = z + 719_468;
    let era = (if (zz >= 0) { zz } else { zz - 146_096 }) / 146_097;
    let doe = zz - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if (mp < 10) { mp + 3 } else { mp - 9 };
    (if (m <= 2) { y + 1 } else { y }, m, d);
  };

  func pad2(n : Int) : Text {
    if (n < 10) { "0" # n.toText() } else { n.toText() };
  };

  /// Compute the `YYYY-MM-DD` day key for a timestamp.
  public func dayKeyOf(timestamp : Timestamp) : DayKey {
    let seconds = timestamp / nanosPerSecond;
    let days = if (seconds >= 0) { seconds / secondsPerDay } else {
      (seconds - (secondsPerDay - 1)) / secondsPerDay;
    };
    let (y, m, d) = civilFromDays(days);
    y.toText() # "-" # pad2(m) # "-" # pad2(d);
  };

  /// Great-circle distance in meters between two coordinates.
  public func distanceMeters(
    lat1 : Types.Latitude,
    lon1 : Types.Longitude,
    lat2 : Types.Latitude,
    lon2 : Types.Longitude,
  ) : Float {
    let phi1 = lat1 * degreesToRadians;
    let phi2 = lat2 * degreesToRadians;
    let dPhi = (lat2 - lat1) * degreesToRadians;
    let dLambda = (lon2 - lon1) * degreesToRadians;
    let sinHalfDPhi = Float32.sin((dPhi / 2.0).toFloat32()).toFloat();
    let sinHalfDLambda = Float32.sin((dLambda / 2.0).toFloat32()).toFloat();
    let cosPhi1 = Float32.cos(phi1.toFloat32()).toFloat();
    let cosPhi2 = Float32.cos(phi2.toFloat32()).toFloat();
    let a = sinHalfDPhi * sinHalfDPhi
      + cosPhi1 * cosPhi2 * sinHalfDLambda * sinHalfDLambda;
    let clamped = if (a < 0.0) { 0.0 } else if (a > 1.0) { 1.0 } else { a };
    let c = 2.0 * Float32.arcsin(Float32.sqrt(clamped.toFloat32())).toFloat();
    earthRadiusMeters * c;
  };

  /// Find the work location that contains the given coordinates, if any.
  public func findContainingLocation(
    locations : List.List<Types.WorkLocation>,
    position : Types.GpsPosition,
  ) : ?Types.WorkLocation {
    locations.find(func(location) {
      distanceMeters(
        position.latitude,
        position.longitude,
        location.latitude,
        location.longitude,
      ) <= location.radiusMeters.toFloat();
    });
  };

  /// Find the closest work location and its distance from the position.
  public func nearestLocation(
    locations : List.List<Types.WorkLocation>,
    position : Types.GpsPosition,
  ) : ?(Types.WorkLocation, Float) {
    var best : ?(Types.WorkLocation, Float) = null;
    for (location in locations.values()) {
      let distance = distanceMeters(
        position.latitude,
        position.longitude,
        location.latitude,
        location.longitude,
      );
      switch (best) {
        case (null) { best := ?(location, distance) };
        case (?(_, bestDistance)) {
          if (distance < bestDistance) { best := ?(location, distance) };
        };
      };
    };
    best;
  };

  /// Locate today's record for a user, if one exists.
  public func findTodayRecord(
    records : List.List<Types.AttendanceRecord>,
    user : UserId,
    day : DayKey,
  ) : ?Types.AttendanceRecord {
    records.find(func(record) {
      record.user == user and record.day == day;
    });
  };

  /// Convert an internal record to its shared view.
  public func toView(record : Types.AttendanceRecord) : Types.AttendanceView {
    {
      id = record.id;
      user = record.user;
      day = record.day;
      clockIn = record.clockIn;
      clockOut = record.clockOut;
      clockInPosition = record.clockInPosition;
      clockOutPosition = record.clockOutPosition;
      clockInSelfie = record.clockInSelfie;
      clockOutSelfie = record.clockOutSelfie;
      locationId = record.locationId;
    };
  };

  /// Derive today's status for a user from the record list.
  public func todayStatus(
    records : List.List<Types.AttendanceRecord>,
    user : UserId,
    day : DayKey,
  ) : Types.TodayStatus {
    switch (findTodayRecord(records, user, day)) {
      case (null) { #notClockedIn };
      case (?record) {
        switch (record.clockOut) {
          case (null) { #clockedIn({ clockIn = record.clockIn }) };
          case (?clockOut) {
            #clockedOut({ clockIn = record.clockIn; clockOut });
          };
        };
      };
    };
  };

  /// List a user's attendance records, newest first.
  public func listForUser(
    records : List.List<Types.AttendanceRecord>,
    user : UserId,
  ) : [Types.AttendanceView] {
    let views = records.filter(func(record) { record.user == user })
      .map<Types.AttendanceRecord, Types.AttendanceView>(func(record) = toView(record))
      .toArray();
    views.sort(func(a, b) = Int.compare(b.clockIn, a.clockIn));
  };

  /// List all attendance records, optionally filtered by day and/or user.
  public func listFiltered(
    records : List.List<Types.AttendanceRecord>,
    day : ?DayKey,
    user : ?UserId,
  ) : [Types.AttendanceView] {
    let views = records.filter(func(record) {
      let dayMatches = switch (day) {
        case (null) { true };
        case (?d) { record.day == d };
      };
      let userMatches = switch (user) {
        case (null) { true };
        case (?u) { record.user == u };
      };
      dayMatches and userMatches;
    }).map<Types.AttendanceRecord, Types.AttendanceView>(func(record) = toView(record))
      .toArray();
    views.sort(func(a, b) = Int.compare(b.clockIn, a.clockIn));
  };

  /// Add a work location and return the created record.
  public func addLocation(
    locations : List.List<Types.WorkLocation>,
    counters : Counters,
    name : Text,
    latitude : Types.Latitude,
    longitude : Types.Longitude,
    radiusMeters : Types.RadiusMeters,
  ) : Types.WorkLocation {
    let location : Types.WorkLocation = {
      id = counters.nextLocationId;
      name;
      latitude;
      longitude;
      radiusMeters;
    };
    counters.nextLocationId += 1;
    locations.add(location);
    location;
  };

  /// Update an existing work location by id.
  public func updateLocation(
    locations : List.List<Types.WorkLocation>,
    id : Nat,
    name : Text,
    latitude : Types.Latitude,
    longitude : Types.Longitude,
    radiusMeters : Types.RadiusMeters,
  ) : Bool {
    switch (locations.find(func(location) { location.id == id })) {
      case (null) { false };
      case (?existing) {
        let updated : Types.WorkLocation = {
          id = existing.id;
          name;
          latitude;
          longitude;
          radiusMeters;
        };
        let snapshot = locations.toArray();
        locations.clear();
        for (location in snapshot.values()) {
          if (location.id == id) { locations.add(updated) } else {
            locations.add(location);
          };
        };
        true;
      };
    };
  };

  /// Delete a work location by id.
  public func deleteLocation(
    locations : List.List<Types.WorkLocation>,
    id : Nat,
  ) : Bool {
    var removed = false;
    let snapshot = locations.toArray();
    locations.clear();
    for (location in snapshot.values()) {
      if (location.id == id) { removed := true } else { locations.add(location) };
    };
    removed;
  };

  /// List all configured work locations.
  public func listLocations(
    locations : List.List<Types.WorkLocation>,
  ) : [Types.WorkLocation] {
    locations.toArray();
  };

  /// Record a clock-in for a user.
  public func clockIn(
    records : List.List<Types.AttendanceRecord>,
    counters : Counters,
    user : UserId,
    day : DayKey,
    timestamp : Timestamp,
    position : Types.GpsPosition,
    selfie : Storage.ExternalBlob,
    locationId : Nat,
  ) : Types.AttendanceRecord {
    let record : Types.AttendanceRecord = {
      id = counters.nextAttendanceId;
      user;
      day;
      clockIn = timestamp;
      clockOut = null;
      clockInPosition = position;
      clockOutPosition = null;
      clockInSelfie = selfie;
      clockOutSelfie = null;
      locationId;
    };
    counters.nextAttendanceId += 1;
    records.add(record);
    record;
  };

  /// Record a clock-out for a user's existing record.
  public func clockOut(
    records : List.List<Types.AttendanceRecord>,
    user : UserId,
    day : DayKey,
    timestamp : Timestamp,
    position : Types.GpsPosition,
    selfie : Storage.ExternalBlob,
  ) : ?Types.AttendanceRecord {
    switch (findTodayRecord(records, user, day)) {
      case (null) { null };
      case (?existing) {
        let updated : Types.AttendanceRecord = {
          id = existing.id;
          user = existing.user;
          day = existing.day;
          clockIn = existing.clockIn;
          clockOut = ?timestamp;
          clockInPosition = existing.clockInPosition;
          clockOutPosition = ?position;
          clockInSelfie = existing.clockInSelfie;
          clockOutSelfie = ?selfie;
          locationId = existing.locationId;
        };
        let snapshot = records.toArray();
        records.clear();
        for (record in snapshot.values()) {
          if (record.id == existing.id) { records.add(updated) } else {
            records.add(record);
          };
        };
        ?updated;
      };
    };
  };
};
