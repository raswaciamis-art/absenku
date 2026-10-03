import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";

/**
 * Shared access to the typed backend actor.
 *
 * Always call this at the top level of a hook or component — never inside a
 * query or mutation callback. `actor` is `null` until the canister connection
 * is ready; gate queries on `isReady`.
 */
export function useBackend() {
  const { actor, isFetching } = useActor(createActor);
  return {
    actor,
    isFetching,
    isReady: !!actor && !isFetching,
  };
}
