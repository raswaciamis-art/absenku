import List "mo:core/List";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import ListEntity "mo:caffeineai-oql/ListEntity";
import TextValue "mo:caffeineai-oql/TextValue";
import FloatValue "mo:caffeineai-oql/FloatValue";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import Types "types/attendance";
import AttendanceLib "lib/attendance";
import AttendanceApi "mixins/attendance-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);
  include MixinObjectStorage();

  let workLocations : List.List<Types.WorkLocation>;
  let attendanceRecords : List.List<Types.AttendanceRecord>;
  let counters : AttendanceLib.Counters;

  include AttendanceApi(accessControlState, workLocations, attendanceRecords, counters);
  include ApiDocMixin();

  include Expose({
    entities = [
      workLocations.toEntityManual("workLocation", "WorkLocation", "id")
        .sample({ id = 0; name = ""; latitude = 0.0; longitude = 0.0; radiusMeters = 0 })
        .payload("name", func l = l.name)
        .payload("latitude", func l = l.latitude)
        .payload("longitude", func l = l.longitude)
        .payload("radiusMeters", func l = l.radiusMeters)
        .controllerOnly()
        .build(),
      attendanceRecords.toEntityManual("attendanceRecord", "AttendanceRecord", "id")
        .sample({
          id = 0;
          user = Principal.fromText("aaaaa-aa");
          day = "";
          clockIn = 0 : Types.Timestamp;
          clockOut = null : ?Types.Timestamp;
          clockInPosition = { latitude = 0.0; longitude = 0.0; accuracyMeters = 0.0 };
          clockOutPosition = null : ?Types.GpsPosition;
          clockInSelfie = "" : Blob;
          clockOutSelfie = null : ?Blob;
          locationId = 0;
        })
        .payload("user", func r = r.user)
        .payload("day", func r = r.day)
        .payload("clockIn", func r = r.clockIn)
        .payload("clockOut", func r = switch (r.clockOut) { case null ""; case (?t) t.toText() })
        .payload("locationId", func r = r.locationId)
        .controllerOnly()
        .build(),
    ];
  });
};
