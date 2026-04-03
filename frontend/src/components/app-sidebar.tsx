import {
  ChevronDown,
  ChevronUp,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { cn } from "./ui/utils";
import beezLogo from "figma:asset/e78fffddab88e738f7460441ac9695d5a0e809a4.png";
import { BackendUser } from "../lib/api";
import { MODULE_DEFINITIONS, MODULE_IDS } from "../lib/modules";
import type { ModuleId } from "../lib/modules";
import type { Role } from "../lib/permissions";

interface AppSidebarProps {
  currentView: string | null;
  currentModule: ModuleId;
  moduleSwitcherDocked: boolean;
  onModuleSwitcherToggle: () => void;
  onModuleChange: (module: ModuleId) => void;
  onViewChange: (view: string) => void;
  user: BackendUser;
  onLogout: () => void;
}

function getInitials(name: string | undefined) {
  if (!name) return "AU";
  const [first = "", second = ""] = name.trim().split(" ");
  const initials = `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  return initials || "AU";
}

function normalizeRole(role: string | undefined): Role {
  const r = (role ?? "").toLowerCase();
  if (r === "admin" || r.includes("admin")) return "admin";
  if (r === "senior" || r.includes("senior")) return "senior";
  if (r === "junior" || r.includes("junior")) return "junior";
  if (r === "manager" || r.includes("manager")) return "manager";
  return "manager";
}

// ── Map ModuleId → module_access key used by the backend ─────────────────────
const MODULE_ACCESS_KEY: Record<ModuleId, "gads" | "seo" | "website"> = {
  "g-ads":   "gads",
  "seo":     "seo",
  "website": "website",
};

// ── Map feature.id → backend page key ────────────────────────────────────────
const FEATURE_TO_PAGE_KEY: Record<string, string> = {
  // g-ads
  "dashboard":         "dashboard",
  "accounts":          "inputs",
  "recommendations":   "reports",
  "reports":           "reports",
  "checklist":         "settings",
  // seo
  "seo-overview":      "dashboard",
  "web-errors":        "dashboard",
  "technical-seo":     "inputs",
  "content-seo":       "inputs",
  "links-seo":         "projects",
  "speed-test":        "projects",
  "ai-insights":       "reports",
  // website
  "website-dashboard": "dashboard",
  "inputs":            "inputs",
  "projects":          "projects",
  "website-settings":  "settings",
};

const ALL_MODULES = MODULE_IDS.map((id) => MODULE_DEFINITIONS[id]);

export function AppSidebar({
  currentView,
  currentModule,
  moduleSwitcherDocked,
  onModuleSwitcherToggle,
  onModuleChange,
  onViewChange,
  user,
  onLogout,
}: AppSidebarProps) {
  const userRole = normalizeRole(user.role);
  const isAdmin = userRole === "admin";
  const workspaceLabel = isAdmin ? "Admin Dashboard" : "Manager Workspace";

  // ── Filter which modules appear in the switcher ───────────────────────────
  // Admin sees all modules. Non-admin only sees modules where at least 1 page is granted.
  const visibleModules = ALL_MODULES.filter((module) => {
    if (isAdmin) return true;
    const moduleAccess = user.module_access;
    if (!moduleAccess) return false;
    const accessKey = MODULE_ACCESS_KEY[module.id];
    const allowedPages: string[] = moduleAccess[accessKey] ?? [];
    return allowedPages.length > 0;
  });

  const activeModule = MODULE_DEFINITIONS[currentModule] ?? visibleModules[0] ?? ALL_MODULES[0];
  const moduleFeatures = activeModule?.features ?? [];

  // ── Filter sidebar nav items based on backend module_access ───────────────
  const visibleFeatures = moduleFeatures.filter((item) => {
    if (isAdmin) return true;
    const moduleAccess = user.module_access;
    if (!moduleAccess) return false;
    const accessKey = MODULE_ACCESS_KEY[currentModule];
    const allowedPages: string[] = moduleAccess[accessKey] ?? [];
    const pageKey = FEATURE_TO_PAGE_KEY[item.id] ?? item.id;
    return allowedPages.includes(pageKey);
  });

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={beezLogo} alt="Beez Logo" className="h-12 w-12 object-contain" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-slate-900">Atlas</h2>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                {activeModule.shortLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">{workspaceLabel}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3">

            {/* Module Switcher */}
            <div className="rounded-xl border bg-white/70 shadow-sm transition-all">
              <button
                type="button"
                onClick={onModuleSwitcherToggle}
                className="flex w-full items-center justify-between px-3 py-3 text-left"
                aria-expanded={!moduleSwitcherDocked}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <activeModule.icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Modules
                    </p>
                    <span className="text-sm font-semibold text-slate-900">
                      {activeModule.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium">
                    Switch
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      !moduleSwitcherDocked && "rotate-180"
                    )}
                  />
                </div>
              </button>

              {!moduleSwitcherDocked && (
                <div className="flex flex-col gap-2 px-3 pb-3">
                  {visibleModules.map((module) => {
                    const isActive = module.id === activeModule.id;
                    return (
                      <button
                        key={module.id}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-150",
                          isActive
                            ? "border-[#EF4F6E]/30 bg-[#FEE2E8] text-[#EF4F6E] shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700",
                        )}
                        onClick={() => onModuleChange(module.id)}
                      >
                        <div className="flex items-center gap-2">
                          <module.icon
                            className={cn(
                              "h-4 w-4",
                              isActive ? "text-[#EF4F6E]" : "text-slate-400",
                            )}
                          />
                          <span className={cn(
                            "truncate text-sm font-medium",
                            isActive ? "text-[#EF4F6E]" : "text-slate-700"
                          )}>
                            {module.shortLabel}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[11px]",
                          isActive ? "text-[#EF4F6E]/70" : "text-slate-400"
                        )}>
                          {module.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Nav Items — filtered by backend module_access */}
            <SidebarMenu className="gap-1 pt-1">
              {visibleFeatures.map((item) => {
                const active = currentView === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      className={cn(
                        "h-auto items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                        active
                          ? "!bg-[#EF4F6E] !text-white hover:!bg-[#e0415f]"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                      onClick={() => onViewChange(item.id)}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-white" : "text-slate-400"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-medium leading-tight",
                          active ? "text-white" : "text-slate-800"
                        )}
                      >
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — user avatar + dropdown */}
      <SidebarFooter className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <div className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-100">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-600 text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm text-slate-900">{user.name || "Team Member"}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <ChevronUp className="h-4 w-4 text-slate-400" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2 w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdmin && (
              <DropdownMenuItem onClick={() => onViewChange("users")}>
                <Users className="mr-2 h-4 w-4" />
                <span>User Management</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onViewChange("settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
