import { UserRole } from "@/backend";
import { useBackend } from "@/hooks/useBackend";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";

/**
 * Authentication + role state for the whole app.
 *
 * - `isAuthenticated` covers both a fresh login and a restored session.
 * - `isAdmin` is derived from the backend role, not from local state.
 *
 * The backend exposes no profile endpoint, so the display name is kept as
 * local UI state via `useDisplayName` (see `hooks/useDisplayName.ts`).
 */
export function useAuth() {
  const {
    identity,
    login,
    clear,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
    isSessionExpired,
    loginError,
  } = useInternetIdentity();
  const { actor, isReady } = useBackend();

  const roleQuery = useQuery<UserRole>({
    queryKey: ["callerRole"],
    queryFn: async () => {
      if (!actor) return UserRole.guest;
      return actor.getCallerUserRole();
    },
    enabled: isReady && isAuthenticated,
    retry: false,
  });

  const role = roleQuery.data ?? UserRole.guest;

  return {
    identity,
    principal: identity?.getPrincipal() ?? null,
    login,
    logout: clear,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
    isSessionExpired,
    loginError,
    role,
    isAdmin: role === UserRole.admin,
    isRoleLoading: roleQuery.isLoading,
    refetchRole: roleQuery.refetch,
  };
}
