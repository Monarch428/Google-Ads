import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardApp } from "./dashboard-app";
import { DataProvider } from "./lib/data-context";
import { LoginPage } from "./components/auth/login-page";
import { AuthResponse, BackendUser } from "./lib/api";
import { Toaster } from "./components/ui/sonner";
import { useRouter } from "./lib/router";
import { toast } from "sonner@2.0.3";

const AUTH_TOKEN_KEY = "aaa_auth_token";
const AUTH_REFRESH_TOKEN_KEY = "aaa_auth_refresh_token";
const AUTH_USER_KEY = "aaa_auth_user";

type AuthState = {
  token: string;
  refreshToken: string;
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
    const storedRefreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    const storedUser = parseStoredUser(localStorage.getItem(AUTH_USER_KEY));

    if (storedToken && storedUser && storedRefreshToken) {
      return { token: storedToken, refreshToken: storedRefreshToken, user: storedUser };
    }

    return null;
  });

  const handleAuthenticated = useCallback(
    (response: AuthResponse) => {
      const nextState: AuthState = {
        token: response.access_token,
        refreshToken: response.refresh_token,
        user: response.user,
      };

      setAuthState(nextState);
      localStorage.setItem(AUTH_TOKEN_KEY, nextState.token);
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, nextState.refreshToken);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextState.user));
      navigate("/dashboard", { replace: true });
    },
    [navigate],
  );

  const handleUserUpdated = useCallback((updatedUser: BackendUser) => {
    setAuthState((prev) => {
      if (!prev) return prev;
      const nextState: AuthState = { ...prev, user: updatedUser };
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextState.user));
      return nextState;
    });
  }, []);

  const isOnGoogleCallback = path === "/auth/google/callback";
  const hasProcessedGoogleOAuthRef = useRef(false);
  const [isProcessingGoogleOAuth, setIsProcessingGoogleOAuth] = useState(false);

  useEffect(() => {
    if (!authState) {
      if (path !== "/login" && !isOnGoogleCallback) {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (path === "/" || path === "/login") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState, path, navigate, isOnGoogleCallback]);

  const processGoogleOAuth = useCallback(() => {
    if (!isOnGoogleCallback || hasProcessedGoogleOAuthRef.current) {
      return;
    }

    hasProcessedGoogleOAuthRef.current = true;
    setIsProcessingGoogleOAuth(true);

    try {
      if (typeof window === "undefined") {
        throw new Error("Window is not available");
      }

      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("auth");

      if (!encoded) {
        throw new Error("Missing Google authentication payload");
      }

      const decoded = decodeURIComponent(encoded);
      const parsed = JSON.parse(decoded) as AuthResponse;

      if (
        !parsed ||
        typeof parsed.access_token !== "string" ||
        typeof parsed.refresh_token !== "string" ||
        !parsed.user ||
        typeof parsed.user !== "object"
      ) {
        throw new Error("Invalid Google authentication response");
      }

      window.history.replaceState(null, "", "/auth/google/callback");
      handleAuthenticated(parsed);
      toast.success("Signed in with Google", {
        description: `Welcome back, ${parsed.user.name ?? parsed.user.email}!`,
      });
    } catch (error) {
      hasProcessedGoogleOAuthRef.current = false;
      const message =
        error instanceof Error ? error.message : "Unable to complete Google sign-in";
      toast.error("Google sign-in failed", { description: message });
      navigate("/login", { replace: true });
    } finally {
      setIsProcessingGoogleOAuth(false);
    }
  }, [handleAuthenticated, isOnGoogleCallback, navigate]);

  useEffect(() => {
    if (isOnGoogleCallback) {
      processGoogleOAuth();
    } else {
      hasProcessedGoogleOAuthRef.current = false;
      setIsProcessingGoogleOAuth(false);
    }
  }, [isOnGoogleCallback, processGoogleOAuth]);

  const handleLogout = useCallback(() => {
    setAuthState(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    navigate("/login", { replace: true });
  }, [navigate]);

  let content: JSX.Element;

  if (isOnGoogleCallback) {
    content = (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-muted-foreground text-sm">
          {isProcessingGoogleOAuth
            ? "Completing Google sign-in..."
            : "Redirecting..."}
        </p>
      </div>
    );
  } else if (authState) {
    content = (
      <DataProvider authToken={authState.token}>
        <DashboardApp
          user={authState.user}
          token={authState.token}
          refreshToken={authState.refreshToken}
          onLogout={handleLogout}
          onUserUpdated={handleUserUpdated}
        />
      </DataProvider>
    );
  } else {
    content = <LoginPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <>
      {content}
      <Toaster position="top-right" richColors />
    </>
  );
}
