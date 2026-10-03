import { useBackend } from "@/hooks/useBackend";
import type {
  AttendanceView,
  DayKey,
  GpsPosition,
  Result,
  Result_1,
  Result_2,
  Result_3,
  TodayStatus,
  UserId,
  WorkLocation,
} from "@/types";
import type { ExternalBlob } from "@caffeineai/object-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Today's clock-in / clock-out status for the signed-in employee. */
export function useTodayStatus() {
  const { actor, isReady } = useBackend();
  return useQuery<TodayStatus>({
    queryKey: ["todayStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.getTodayStatus();
    },
    enabled: isReady,
  });
}

/** The signed-in employee's own attendance history. */
export function useMyAttendance() {
  const { actor, isReady } = useBackend();
  return useQuery<AttendanceView[]>({
    queryKey: ["myAttendance"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyAttendance();
    },
    enabled: isReady,
  });
}

/** Admin recap, optionally filtered by day and/or employee. */
export function useAttendanceRecap(day: DayKey | null, user: UserId | null) {
  const { actor, isReady } = useBackend();
  return useQuery<Result_1>({
    queryKey: ["attendanceRecap", day, user?.toString() ?? null],
    queryFn: async () => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.getAttendanceRecap(day, user);
    },
    enabled: isReady,
  });
}

/** All configured work locations. */
export function useWorkLocations() {
  const { actor, isReady } = useBackend();
  return useQuery<WorkLocation[]>({
    queryKey: ["workLocations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listWorkLocations();
    },
    enabled: isReady,
  });
}

/** Record a clock-in with GPS position and mandatory selfie. */
export function useClockIn() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation<
    Result_3,
    Error,
    { position: GpsPosition; selfie: ExternalBlob }
  >({
    mutationFn: async ({ position, selfie }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.clockIn(position, selfie);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["todayStatus"] });
      void queryClient.invalidateQueries({ queryKey: ["myAttendance"] });
      void queryClient.invalidateQueries({ queryKey: ["attendanceRecap"] });
    },
  });
}

/** Record a clock-out with GPS position and mandatory selfie. */
export function useClockOut() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation<
    Result_3,
    Error,
    { position: GpsPosition; selfie: ExternalBlob }
  >({
    mutationFn: async ({ position, selfie }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.clockOut(position, selfie);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["todayStatus"] });
      void queryClient.invalidateQueries({ queryKey: ["myAttendance"] });
      void queryClient.invalidateQueries({ queryKey: ["attendanceRecap"] });
    },
  });
}

/** Create a work location (admin only). */
export function useAddWorkLocation() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation<
    Result,
    Error,
    { name: string; latitude: number; longitude: number; radiusMeters: bigint }
  >({
    mutationFn: async ({ name, latitude, longitude, radiusMeters }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.addWorkLocation(name, latitude, longitude, radiusMeters);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workLocations"] });
    },
  });
}

/** Update a work location (admin only). */
export function useUpdateWorkLocation() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation<
    Result,
    Error,
    {
      id: bigint;
      name: string;
      latitude: number;
      longitude: number;
      radiusMeters: bigint;
    }
  >({
    mutationFn: async ({ id, name, latitude, longitude, radiusMeters }) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.updateWorkLocation(
        id,
        name,
        latitude,
        longitude,
        radiusMeters,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workLocations"] });
    },
  });
}

/** Delete a work location (admin only). */
export function useDeleteWorkLocation() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation<Result_2, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Backend belum siap");
      return actor.deleteWorkLocation(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workLocations"] });
    },
  });
}
