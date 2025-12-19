import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMccStatus, type MccStatusResponse } from "./api";
import type { Client } from "./mock-data";

export const DEFAULT_LOGIN_CUSTOMER_ID = import.meta.env.VITE_LOGIN_CUSTOMER_ID ?? "";

interface UseMccStatusArgs {
  authToken?: string;
  clients: Client[];
  fallbackLoginCustomerId?: string;
  isAdmin: boolean;
}

export function useMccStatus({
  authToken,
  clients,
  fallbackLoginCustomerId = DEFAULT_LOGIN_CUSTOMER_ID,
  isAdmin,
}: UseMccStatusArgs) {
  const [mccStatus, setMccStatus] = useState<MccStatusResponse | null>(null);
  const [loadingMccStatus, setLoadingMccStatus] = useState(false);

  const refreshMccStatus = useCallback(async () => {
    if (!isAdmin || !authToken) return;

    setLoadingMccStatus(true);
    try {
      const status = await fetchMccStatus(authToken);
      setMccStatus(status);
    } catch (error) {
      console.error("Failed to fetch MCC status", error);
    } finally {
      setLoadingMccStatus(false);
    }
  }, [authToken, isAdmin]);

  useEffect(() => {
    refreshMccStatus();
  }, [refreshMccStatus]);

  const loginCustomerId = useMemo(
    () => mccStatus?.login_customer_id || fallbackLoginCustomerId,
    [fallbackLoginCustomerId, mccStatus?.login_customer_id],
  );

  const mccConnected = useMemo(
    () => (mccStatus?.connected ?? false) || clients.some((client) => client.hasGoogleOAuth),
    [clients, mccStatus?.connected],
  );

  return { mccStatus, loadingMccStatus, loginCustomerId, mccConnected, refreshMccStatus };
}