import { useEffect, useMemo, useState } from "react";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { DashboardOverview } from "./components/dashboard-overview";
import { Accounts } from "./components/accounts";
import { AIRecommendations } from "./components/ai-recommendations";
import { ClientReports } from "./components/client-reports";
import { UserManagement } from "./components/user-management";
import { ClientDetails } from "./components/client-details";
import { Settings } from "./components/settings";
import { SetupChecklist } from "./components/setup-checklist";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./components/ui/sheet";
import { ManagerDetails } from "./components/manager-details";
import { BundleDetails } from "./components/bundle-details";
import { ReportPreview } from "./components/report-preview";
import { AlertDetails } from "./components/alert-details";
import { ModuleFeatureBoard } from "./components/module-feature-board";
import { Alert as AlertType, Manager } from "./lib/mock-data";
import { BackendUser } from "./lib/api";
import { useRouter } from "./lib/router";
import {
  GLOBAL_VIEW_ROUTES,
  MODULE_DEFINITIONS,
  MODULE_IDS,
  MODULE_VIEW_ROUTES,
  getModuleDefaultRoute,
  isModuleId,
} from "./lib/modules";
import type { ModuleId } from "./lib/modules";

type DashboardAppProps = {
  user: BackendUser;
  token?: string;
  onLogout: () => void;
  onUserUpdated?: (user: BackendUser) => void;
};

type ViewContext = {
  moduleId: ModuleId;
  viewId: string;
  kind: "module" | "global";
  canonicalPath: string;
};

function resolveRoute(path: string, currentModule: ModuleId, isAdmin: boolean): ViewContext {
  for (const moduleId of MODULE_IDS) {
    const routes = MODULE_VIEW_ROUTES[moduleId];
    for (const [viewId, route] of Object.entries(routes)) {
      if (route === path) {
        const safeView =
          viewId === "users" && !isAdmin ? MODULE_DEFINITIONS[moduleId].defaultView : viewId;
        const canonicalPath = routes[safeView] ?? getModuleDefaultRoute(moduleId);
        return { moduleId, viewId: safeView, kind: "module", canonicalPath };
      }
    }
  }

  if (path.startsWith("/modules/")) {
    const [, , moduleSlug] = path.split("/");
    if (moduleSlug && isModuleId(moduleSlug)) {
      const defaultRoute = getModuleDefaultRoute(moduleSlug);
      return {
        moduleId: moduleSlug,
        viewId: MODULE_DEFINITIONS[moduleSlug].defaultView,
        kind: "module",
        canonicalPath: defaultRoute,
      };
    }
  }

  for (const [viewId, route] of Object.entries(GLOBAL_VIEW_ROUTES)) {
    if (route === path) {
      if (viewId === "users" && !isAdmin) break;
      return { moduleId: currentModule, viewId, kind: "global", canonicalPath: route };
    }
  }

  const fallbackModule = currentModule ?? "g-ads";
  const defaultRoute = getModuleDefaultRoute(fallbackModule);
  return {
    moduleId: fallbackModule,
    viewId: MODULE_DEFINITIONS[fallbackModule].defaultView,
    kind: "module",
    canonicalPath: defaultRoute,
  };
}

export function DashboardApp({ user, token, onLogout, onUserUpdated }: DashboardAppProps) {
  const { path, navigate } = useRouter();
  const normalizedRole = (user.role ?? "").toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const [selectedModule, setSelectedModule] = useState<ModuleId>("g-ads");
  const [moduleSwitcherDocked, setModuleSwitcherDocked] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Global side panel state
  const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const routeContext = useMemo(
    () => resolveRoute(path, selectedModule, isAdmin),
    [path, selectedModule, isAdmin],
  );

  useEffect(() => {
    if (routeContext.kind === "module" && routeContext.moduleId !== selectedModule) {
      setSelectedModule(routeContext.moduleId);
    }
  }, [routeContext, selectedModule]);

  useEffect(() => {
    if (routeContext.canonicalPath !== path) {
      navigate(routeContext.canonicalPath, { replace: true });
    }
  }, [routeContext.canonicalPath, path, navigate]);

  useEffect(() => {
    setSelectedClient(null);
    setSelectedAlert(null);
    setSelectedManager(null);
    setSelectedBundle(null);
    setSelectedReport(null);
  }, [path]);

  // Handle view change and clear any detail views
  const handleViewChange = (view: string) => {
    if (view === "users" && !isAdmin) {
      navigate(getModuleDefaultRoute(selectedModule), { replace: true });
      return;
    }

    if (GLOBAL_VIEW_ROUTES[view]) {
      const targetRoute = GLOBAL_VIEW_ROUTES[view];
      if (targetRoute !== path) {
        navigate(targetRoute);
      }
      return;
    }

    const moduleRoutes = MODULE_VIEW_ROUTES[selectedModule];
    const targetRoute = moduleRoutes[view] ?? getModuleDefaultRoute(selectedModule);
    if (targetRoute !== path) {
      navigate(targetRoute);
    }
  };

  const handleModuleChange = (moduleId: ModuleId) => {
    setSelectedModule(moduleId);
    setModuleSwitcherDocked(true);
    const targetRoute = getModuleDefaultRoute(moduleId);
    if (targetRoute !== path) {
      navigate(targetRoute);
    }
  };

  const handleModuleSectionToggle = () => {
    setModuleSwitcherDocked((prev) => !prev);
  };

  const renderContent = () => {
    if (routeContext.viewId === "settings") {
      return <Settings user={user} authToken={token} onUserUpdated={onUserUpdated} />;
    }

    if (routeContext.viewId === "users" && isAdmin) {
      return <UserManagement onManagerClick={setSelectedManager} />;
    }

    if (selectedClient) {
      return <ClientDetails clientId={selectedClient} onBack={() => setSelectedClient(null)} />;
    }

    if (selectedModule === "g-ads") {
      switch (routeContext.viewId) {
        case "dashboard":
          return (
            <DashboardOverview
              onClientClick={setSelectedClient}
              onNavigate={handleViewChange}
              onAlertClick={setSelectedAlert}
              onManagerClick={setSelectedManager}
              onBundleClick={setSelectedBundle}
              onReportClick={setSelectedReport}
            />
          );
        case "accounts":
          return <Accounts onClientClick={setSelectedClient} />;
        case "recommendations":
          return <AIRecommendations onBundleClick={setSelectedBundle} />;
        case "reports":
          return <ClientReports onReportClick={setSelectedReport} />;
        case "checklist":
          return <SetupChecklist />;
        default:
          return (
            <DashboardOverview
              onClientClick={setSelectedClient}
              onNavigate={handleViewChange}
              onAlertClick={setSelectedAlert}
              onManagerClick={setSelectedManager}
              onBundleClick={setSelectedBundle}
              onReportClick={setSelectedReport}
            />
          );
      }
    }

    const moduleDefinition = MODULE_DEFINITIONS[selectedModule];
    return (
      <ModuleFeatureBoard
        module={moduleDefinition}
        activeView={routeContext.viewId}
        onNavigate={handleViewChange}
      />
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AppSidebar
          currentView={routeContext.kind === "module" ? routeContext.viewId : null}
          currentModule={selectedModule}
          moduleSwitcherDocked={moduleSwitcherDocked}
          onModuleSwitcherToggle={handleModuleSectionToggle}
          onModuleChange={handleModuleChange}
          onViewChange={handleViewChange}
          user={user}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-auto p-6">{renderContent()}</main>
      </div>

      {/* Global Side Panels */}

      {/* Alert Details Panel */}
      <Sheet open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <div className="px-6 py-6">
            <SheetHeader>
              <SheetTitle>Alert Details</SheetTitle>
              <SheetDescription>View detailed information about this alert</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {selectedAlert && (
                <AlertDetails alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manager Details Panel */}
      <Sheet open={!!selectedManager} onOpenChange={(open) => !open && setSelectedManager(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          <div className="px-6 py-6">
            <SheetHeader>
              <SheetTitle>Manager Details</SheetTitle>
              <SheetDescription>View manager activity and performance details</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {selectedManager && (
                <ManagerDetails manager={selectedManager} onBack={() => setSelectedManager(null)} />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bundle Details Panel */}
      <Sheet open={!!selectedBundle} onOpenChange={(open) => !open && setSelectedBundle(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          <div className="px-6 py-6">
            <SheetHeader>
              <SheetTitle>Action Bundle Details</SheetTitle>
              <SheetDescription>View recommendations and actions in this bundle</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {selectedBundle && (
                <BundleDetails bundleId={selectedBundle} onBack={() => setSelectedBundle(null)} />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Report Preview Panel */}
      <Sheet open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          <div className="px-6 py-6">
            <SheetHeader>
              <SheetTitle>Report Preview</SheetTitle>
              <SheetDescription>
                Preview client report before downloading or sending
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {selectedReport && (
                <ReportPreview reportId={selectedReport} onBack={() => setSelectedReport(null)} />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
