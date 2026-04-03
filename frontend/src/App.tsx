import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardApp } from "./pages/dashboard-app";
import { DataProvider } from "./lib/data-context";
import { GoogleAdsSyncProvider } from "./lib/google-ads-sync-context";
import { LoginPage } from "./components/auth/login-page";
import { AuthResponse, BackendUser } from "./lib/api";
import { Toaster } from "./components/ui/sonner";
import { useRouter } from "./lib/router";
import { toast } from "sonner";
import type { AuthDetails, AuthMethod } from "./lib/auth-types";
import type { ModuleId } from "./lib/modules";

const AUTH_TOKEN_KEY    = "aaa_auth_token";
const AUTH_REFRESH_KEY  = "aaa_refresh_token";
const AUTH_USER_KEY     = "aaa_auth_user";
const AUTH_DETAILS_KEY  = "aaa_auth_details";

type AuthState = {
  token: string;
  refreshToken: string | null;
  user: BackendUser;
  details: AuthDetails | null;
};

// ── Parse the current URL path into moduleId + viewId ────────────────────────
// URL patterns:
//   /modules/g-ads/dashboard   → { module: "g-ads",   view: "dashboard" }
//   /modules/seo/overview      → { module: "seo",      view: "seo-overview" }
//   /modules/website/projects  → { module: "website",  view: "projects" }
//   /dashboard                 → { module: "g-ads",    view: "dashboard" }
//   /users                     → { module: null,        view: "users" }

function parseRouteFromPath(pathname: string): {
  module: ModuleId | null;
  view: string;
} {
  const p = pathname.replace(/\/$/, ""); // strip trailing slash

  // /modules/:moduleId/:view
  const moduleMatch = p.match(/^\/modules\/(g-ads|seo|website)(?:\/(.+))?$/);
  if (moduleMatch) {
    const moduleId = moduleMatch[1] as ModuleId;
    const rawView  = moduleMatch[2] ?? "";

    // Normalise view segment → feature id used in modules.ts
    const VIEW_ALIAS: Record<string, string> = {
      // website
      "dashboard":  moduleId === "website" ? "website-dashboard" : "dashboard",
      "settings":   moduleId === "website" ? "website-settings"  : "settings",
      // seo
      "overview":   "seo-overview",
      "web-errors": "web-errors",
      "technical":  "technical-seo",
      "content":    "content-seo",
      "links":      "links-seo",
      "speed":      "speed-test",
      "insights":   "ai-insights",
    };
    const view = VIEW_ALIAS[rawView] ?? rawView ?? (
      moduleId === "seo"     ? "seo-overview"      :
      moduleId === "website" ? "website-dashboard"  :
      "dashboard"
    );
    return { module: moduleId, view };
  }

  // Legacy / top-level routes
  if (p === "/dashboard" || p === "")   return { module: "g-ads",  view: "dashboard" };
  if (p === "/accounts")                return { module: "g-ads",  view: "accounts" };
  if (p === "/recommendations")         return { module: "g-ads",  view: "recommendations" };
  if (p === "/reports")                 return { module: "g-ads",  view: "reports" };
  if (p === "/checklist")               return { module: "g-ads",  view: "checklist" };
  if (p === "/users")                   return { module: null,      view: "users" };
  if (p === "/settings")                return { module: null,      view: "settings" };

  return { module: "g-ads", view: "dashboard" };
}

function parseStoredUser(value: string | null): BackendUser | null {
  if (!value) return null;
  try { return JSON.parse(value) as BackendUser; }
  catch (error) { console.warn("Failed to parse stored user", error); return null; }
}

function parseStoredAuthDetails(value: string | null): AuthDetails | null {
  if (!value) return null;
  try { return JSON.parse(value) as AuthDetails; }
  catch (error) { console.warn("Failed to parse stored auth details", error); return null; }
}

type AuthMetadataInput = {
  method: AuthMethod;
  request: Record<string, unknown>;
};

export default function App() {
  const { path, navigate } = useRouter();

  const [authState, setAuthState] = useState<AuthState | null>(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser  = parseStoredUser(localStorage.getItem(AUTH_USER_KEY));
    if (storedToken && storedUser) {
      return {
        token:        storedToken,
        refreshToken: localStorage.getItem(AUTH_REFRESH_KEY),
        user:         storedUser,
        details:      parseStoredAuthDetails(localStorage.getItem(AUTH_DETAILS_KEY)),
      };
    }
    return null;
  });

  // ── Derive initial module + view from URL (survives hard reload) ──────────
  const { module: initialModule, view: initialView } = parseRouteFromPath(
    typeof window !== "undefined" ? window.location.pathname : "/dashboard"
  );

  const handleAuthenticated = useCallback(
    (response: AuthResponse, metadata?: AuthMetadataInput) => {
      const details: AuthDetails | null = metadata
        ? { method: metadata.method, request: metadata.request, response, timestamp: new Date().toISOString() }
        : authState?.details ?? null;

      const nextState: AuthState = {
        token:        response.access_token,
        refreshToken: response.refresh_token ?? null,
        user:         response.user,
        details,
      };

      setAuthState(nextState);
      localStorage.setItem(AUTH_TOKEN_KEY, nextState.token);
      if (nextState.refreshToken) {
        localStorage.setItem(AUTH_REFRESH_KEY, nextState.refreshToken);
      } else {
        localStorage.removeItem(AUTH_REFRESH_KEY);
      }
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextState.user));
      if (details) {
        localStorage.setItem(AUTH_DETAILS_KEY, JSON.stringify(details));
      } else {
        localStorage.removeItem(AUTH_DETAILS_KEY);
      }
      navigate("/dashboard", { replace: true });
    },
    [authState?.details, navigate],
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
    if (!isOnGoogleCallback || hasProcessedGoogleOAuthRef.current) return;

    hasProcessedGoogleOAuthRef.current = true;
    setIsProcessingGoogleOAuth(true);

    try {
      if (typeof window === "undefined") throw new Error("Window is not available");

      const params  = new URLSearchParams(window.location.search);
      const encoded = params.get("auth");
      if (!encoded) throw new Error("Missing Google authentication payload");

      const decoded = decodeURIComponent(encoded);
      const parsed  = JSON.parse(decoded) as AuthResponse;

      if (
        !parsed ||
        typeof parsed.access_token  !== "string" ||
        typeof parsed.refresh_token !== "string" ||
        !parsed.user || typeof parsed.user !== "object"
      ) {
        throw new Error("Invalid Google authentication response");
      }

      window.history.replaceState(null, "", "/auth/google/callback");
      handleAuthenticated(parsed, {
        method:  "google",
        request: { provider: "google", encoded_payload: encoded, decoded_payload: parsed },
      });
      toast.success("Signed in with Google", {
        description: `Welcome back, ${parsed.user.name ?? parsed.user.email}!`,
      });
    } catch (error) {
      hasProcessedGoogleOAuthRef.current = false;
      toast.error("Google sign-in failed", {
        description: error instanceof Error ? error.message : "Unable to complete Google sign-in",
      });
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
    localStorage.removeItem(AUTH_REFRESH_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_DETAILS_KEY);
    navigate("/login", { replace: true });
  }, [navigate]);

  let content: React.ReactNode;

  if (isOnGoogleCallback) {
    content = (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-muted-foreground text-sm">
          {isProcessingGoogleOAuth ? "Completing Google sign-in..." : "Redirecting..."}
        </p>
      </div>
    );
  } else if (authState) {
    content = (
      <DataProvider
        authToken={authState.token}
        refreshToken={authState.refreshToken}
        currentUser={authState.user}
        authDetails={authState.details}
      >
        <GoogleAdsSyncProvider>
          <DashboardApp
            user={authState.user}
            token={authState.token}
            onLogout={handleLogout}
            onUserUpdated={handleUserUpdated}
            // ✅ Pass initial module + view derived from the URL
            // DashboardApp must accept and use these as initial state values
            initialModule={initialModule ?? "g-ads"}
            initialView={initialView}
          />
        </GoogleAdsSyncProvider>
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
