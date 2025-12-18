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

const MODULE_LIST = MODULE_IDS.map((id) => MODULE_DEFINITIONS[id]);

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
  const isAdmin = (user.role ?? "").toLowerCase() === "admin";
  const workspaceLabel = isAdmin ? "Admin Dashboard" : "Manager Workspace";
  const activeModule = MODULE_DEFINITIONS[currentModule] ?? MODULE_LIST[0];
  const moduleFeatures = activeModule?.features ?? [];

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={beezLogo} alt="Beez Logo" className="h-12 w-12 object-contain" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {/* <h2 className="text-slate-900">AI Agency Analyst</h2> */}
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
            <div
              className="rounded-xl border bg-white/70 shadow-sm transition-all"
            >
              <button
                type="button"
                onClick={onModuleSwitcherToggle}
                className="flex w-full items-center justify-between px-3 py-3 text-left"
                aria-expanded={!moduleSwitcherDocked}
              >
                <div className="flex items-center gap-3 ">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <activeModule.icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Modules</p>
                    <span className="text-sm font-semibold text-slate-900">{activeModule.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium">Switch</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      !moduleSwitcherDocked && "rotate-180",
                    )}
                  />
                </div>
              </button>
              {!moduleSwitcherDocked && (
                <div className="flex flex-col gap-2 px-3 pb-3">
                  {MODULE_LIST.map((module) => {
                    const isActive = module.id === activeModule.id;
                    return (
                      <button
                        key={module.id}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-150",
                          isActive
                            ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                        )}
                        onClick={() => onModuleChange(module.id)}
                      >
                        <div className="flex items-center gap-2">
                          <module.icon
                            className={cn(
                              "h-4 w-4",
                              isActive ? "text-blue-700" : "text-slate-600",
                            )}
                          />
                          <span className="truncate text-sm font-medium">{module.shortLabel}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{module.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <SidebarMenu className="gap-3 pt-1">
              {moduleFeatures.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    className="h-auto items-start gap-3 rounded-lg px-3 py-3"
                    isActive={currentView === item.id}
                    onClick={() => onViewChange(item.id)}
                  >
                    <item.icon className="mt-0.5 h-5 w-5 shrink-0 " />
                    <div className="flex flex-col gap-1 text-left ">
                      <span className="text-sm font-semibold leading-tight">{item.label}</span>
                      <span className="text-xs leading-snug text-slate-500">{item.description}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
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
