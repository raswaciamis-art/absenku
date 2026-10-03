module {
  /// Principal identifier of a user (karyawan or admin).
  public type UserId = Principal;

  /// Unix timestamp in nanoseconds (as returned by Time.now()).
  public type Timestamp = Int;

  /// Calendar day key in `YYYY-MM-DD` form, used to enforce one record per day.
  public type DayKey = Text;

  /// Latitude/longitude in decimal degrees.
  public type Latitude = Float;
  public type Longitude = Float;

  /// Radius in meters.
  public type RadiusMeters = Nat;
};
