import { useCallback, useEffect, useState } from "react";
import { DashboardApp } from "./dashboard-app";
import { DataProvider } from "./lib/data-context";
import { LoginPage } from "./components/auth/login-page";
import { AuthResponse, BackendUser } from "./lib/api";
import { Toaster } from "./components/ui/sonner";
import { useRouter } from "./lib/router";

const AUTH_TOKEN_KEY = "aaa_auth_token";
const AUTH_USER_KEY = "aaa_auth_user";

type AuthState = {
  token: string;
  user: BackendUser;
};

function parseStoredUser(value: string | null): BackendUser | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as BackendUser;
  } catch (error) {
    console.warn("Failed to parse stored user", error);
    return null;
  }
}

export default function App() {
  const { path, navigate } = useRouter();
  const [authState, setAuthState] = useState<AuthState | null>(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = parseStoredUser(localStorage.getItem(AUTH_USER_KEY));

    if (storedToken && storedUser) {
      return { token: storedToken, user: storedUser };
    }

    return null;
  });

  useEffect(() => {
    if (!authState) {
      if (path !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (path === "/" || path === "/login") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState, path, navigate]);

  const handleAuthenticated = useCallback(
    (response: AuthResponse) => {
      const nextState: AuthState = {
        token: response.access_token,
        user: response.user,
      };

      setAuthState(nextState);
      localStorage.setItem(AUTH_TOKEN_KEY, nextState.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextState.user));
      navigate("/dashboard", { replace: true });
    },
    [navigate],
  );

  const handleLogout = useCallback(() => {
    setAuthState(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    navigate("/login", { replace: true });
  }, [navigate]);

  const content = authState ? (
    <DataProvider authToken={authState.token}>
      <DashboardApp user={authState.user} onLogout={handleLogout} />
    </DataProvider>
  ) : (
    <LoginPage onAuthenticated={handleAuthenticated} />
  );

  return (
    <>
      {content}
      <Toaster position="top-right" richColors />
    </>
  );
}
