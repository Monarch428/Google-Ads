import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type NavigateOptions = {
  replace?: boolean;
};

interface RouterContextValue {
  path: string;
  navigate: (nextPath: string, options?: NavigateOptions) => void;
}

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }

  const [rawPath] = path.split(/[?#]/, 1);
  let normalized = rawPath.trim();

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  // Collapse duplicate slashes (e.g., //dashboard)
  normalized = normalized.replace(/\/+/g, "/");

  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized || "/";
}

function getCurrentPath(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return normalizePath(window.location.pathname);
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string>(() => getCurrentPath());

  useEffect(() => {
    const handlePopState = () => {
      setPath(getCurrentPath());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback(
    (nextPath: string, options?: NavigateOptions) => {
      if (typeof window === "undefined") return;

      const normalized = normalizePath(nextPath);

      if (normalized === path && !options?.replace) {
        return;
      }

      if (options?.replace) {
        window.history.replaceState(null, "", normalized);
      } else {
        window.history.pushState(null, "", normalized);
      }

      setPath(normalized);
    },
    [path],
  );

  const value = useMemo<RouterContextValue>(
    () => ({
      path,
      navigate,
    }),
    [path, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }

  return context;
}
