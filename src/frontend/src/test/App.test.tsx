import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";

const authState = {
  isAuthenticated: false,
  isInitializing: false,
  isSessionExpired: false,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    identity: null,
    principal: null,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: authState.isAuthenticated,
    isInitializing: authState.isInitializing,
    isLoggingIn: false,
    isLoginError: false,
    isSessionExpired: authState.isSessionExpired,
    loginError: null,
    role: "guest",
    isAdmin: false,
    isRoleLoading: false,
    refetchRole: vi.fn(),
  }),
}));

vi.mock("@/router", () => ({ router: {} }));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    RouterProvider: () => <div data-ocid="router.provider" />,
  };
});

beforeEach(() => {
  authState.isAuthenticated = false;
  authState.isInitializing = false;
  authState.isSessionExpired = false;
});

afterEach(cleanup);

describe("App authentication gate", () => {
  it("shows the login screen instead of the app when unauthenticated", () => {
    render(<App />);
    expect(screen.getByTestId("auth.login_button")).toBeInTheDocument();
    expect(screen.queryByTestId("router.provider")).not.toBeInTheDocument();
  });

  it("shows a loading screen while the session is initializing", () => {
    authState.isInitializing = true;
    render(<App />);
    expect(screen.getByTestId("app.loading_state")).toBeInTheDocument();
    expect(screen.queryByTestId("auth.login_button")).not.toBeInTheDocument();
  });

  it("shows the session-expired screen when the session has expired", () => {
    authState.isSessionExpired = true;
    render(<App />);
    expect(screen.getByTestId("auth.reauth_button")).toBeInTheDocument();
  });

  it("renders the router once authenticated", () => {
    authState.isAuthenticated = true;
    render(<App />);
    expect(screen.getByTestId("router.provider")).toBeInTheDocument();
    expect(screen.queryByTestId("auth.login_button")).not.toBeInTheDocument();
  });
});
