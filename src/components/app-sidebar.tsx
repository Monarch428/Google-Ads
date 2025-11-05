import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  Users,
  Settings,
  ChevronUp,
  LogOut,
  ClipboardCheck,
  Building2,
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
import beezLogo from "figma:asset/e78fffddab88e738f7460441ac9695d5a0e809a4.png";
import { BackendUser } from "../lib/api";

interface AppSidebarProps {
  currentView: string;
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

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "accounts", label: "Accounts", icon: Building2 },
  { id: "recommendations", label: "AI Recommendations", icon: Lightbulb },
  { id: "reports", label: "Client Reports", icon: FileText },
  { id: "checklist", label: "Setup Checklist", icon: ClipboardCheck },
];

const systemItems = [
  { id: "users", label: "User Management", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ currentView, onViewChange, user, onLogout }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={beezLogo} alt="Beez Logo" className="w-12 h-12 object-contain" />
          <div>
            <h2 className="text-slate-900">AI Agency Analyst</h2>
            <p className="text-xs text-slate-500">Admin Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={currentView === item.id}
                    onClick={() => onViewChange(item.id)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={currentView === item.id}
                    onClick={() => onViewChange(item.id)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
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
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-blue-600 text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm text-slate-900">{user.name || "Team Member"}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <ChevronUp className="w-4 h-4 text-slate-400" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mb-2">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewChange("settings")}>
              <Settings className="w-4 h-4 mr-2" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
