export type Role = "admin" | "senior" | "manager" | "junior";

const HARD_ROUTE_GUARDS: Record<string, Role[]> = {
  "users": ["admin"],
};

export function canAccess(role: Role, path: string): boolean {
  if (role === "admin") return true;
  const allowed = HARD_ROUTE_GUARDS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}
