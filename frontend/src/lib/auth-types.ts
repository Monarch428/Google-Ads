import type { AuthResponse } from "./api";

export type AuthMethod = "password" | "google";

export type AuthDetails = {
  method: AuthMethod;
  request: Record<string, unknown>;
  response: AuthResponse;
  timestamp: string;
};
